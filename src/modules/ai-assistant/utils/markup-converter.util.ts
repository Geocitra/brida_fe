import { marked } from 'marked';
import TurndownService from 'turndown';

/**
 * SYSTEM ANALYST DESIGN NOTE [GRASP - Pure Fabrication & Adapter]:
 * Kelas utilitas ini mengisolasi penanganan parsing sintaksis Markdown <-> HTML.
 * Mengamankan agar database dan AI tetap mengonsumsi Markdown CommonMark bersih,
 * sedangkan TipTap Editor dan pdfmake menerima representasi HTML visual yang stabil.
 */
export class MarkupConverter {
    private static turndownService: TurndownService | null = null;

    private static normalizePunctuationSpacing(text: string): string {
        return text.replace(/\s+([,.;:!?])/g, '$1');
    }

    /**
     * Mengonfigurasi dan menginisialisasi pustaka Turndown secara malas (lazy initialization)
     * untuk efisiensi performa dan isolasi siklus hidup instansi.
     */
    private static getTurndownInstance(): TurndownService {
        if (this.turndownService) {
            return this.turndownService;
        }

        // Mengonstruksi instansi Turndown dengan pengaturan standar CommonMark
        const service = new TurndownService({
            headingStyle: 'atx',
            hr: '---',
            bulletListMarker: '-',
            codeBlockStyle: 'fenced',
            emDelimiter: '*',
            strongDelimiter: '**',
        });

        /**
         * ATURAN KUSTOM 1 [Protected Variations]: Perataan Paragraf (Text Alignment)
         * Mengonversi elemen HTML TipTap yang memiliki inline style (seperti style="text-align: justify")
         * menjadi tag kontainer CommonMark standar (<div align="justify">) agar aman dibaca database & AI.
         */
        service.addRule('textAlignRule', {
            filter: (node: HTMLElement) => {
                const tagName = node.nodeName.toLowerCase();
                const hasStyleAlign = node.getAttribute('style')?.includes('text-align') || false;
                const hasAlignAttr = node.hasAttribute('align');

                // HANYA proses elemen blok jika mereka memiliki penanda alignment eksplisit
                // DAN mereka BUKAN bagian dari tabel atau list, agar format Turndown asli tidak rusak.
                const isInsideListOrTable = node.closest('li, td, th') !== null;

                return (
                    ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName) &&
                    (hasStyleAlign || hasAlignAttr) &&
                    !isInsideListOrTable // Jangan ganggu paragraf di dalam bullet/tabel
                );
            },
            replacement: (content: string, node: Node) => {
                const element = node as HTMLElement;
                const styleAttr = element.getAttribute('style') || '';
                const alignAttr = element.getAttribute('align') || '';

                let alignment = 'left';
                if (alignAttr) {
                    alignment = alignAttr.toLowerCase();
                } else {
                    const styleMatch = styleAttr.match(/text-align:\s*(left|center|right|justify)/i);
                    if (styleMatch) {
                        alignment = styleMatch[1].toLowerCase();
                    }
                }

                // Jika perataan teks adalah default kiri (left), kembalikan teksnya saja
                // agar Turndown bisa memproses blockquote, heading, paragraf secara native.
                if (alignment === 'left') {
                    return content;
                }

                // Bungkus konten paragraf dengan tag div pembatas alignment yang CommonMark-compliant
                return `\n\n<div align="${alignment}">\n\n${content}\n\n</div>\n\n`;
            },
        });

        /**
         * ATURAN KUSTOM 2 [Information Expert]: Preservasi Token Sitasi [doc-XYZ:chunkIndex]
         * Mencegah konversi Turndown merusak markup token sitasi jika dirender sebagai
         * komponen visual badge oleh TipTap editor.
         */
        service.addRule('citationPreservationRule', {
            filter: (node: HTMLElement) => {
                const tagName = node.nodeName.toLowerCase();
                const isBadge = node.classList.contains('citation-badge') ||
                    node.classList.contains('citation-node') ||
                    node.getAttribute('data-citation') !== null;

                return tagName === 'span' && isBadge;
            },
            replacement: (content: string) => {
                // Hanya kembalikan teks braket asli (misalnya: [doc-001:25]) untuk disimpan ke DB
                return content.trim();
            },
        });

        /**
         * ATURAN KUSTOM 3 [Open-Closed Principle]: Preservasi Ukuran Font (Font Size WYSIWYG) [1.1.2]
         * Mencegah Turndown melucuti atribut inline CSS "style='font-size: ...pt'" pada elemen span.
         * Menjamin ukuran font kustom dari editor tetap terekam secara utuh saat disimpan ke DB.
         */
        service.addRule('fontSizeRule', {
            filter: (node: HTMLElement) => {
                const tagName = node.nodeName.toLowerCase();
                const styleAttr = node.getAttribute('style') || '';
                return tagName === 'span' && styleAttr.includes('font-size');
            },
            replacement: (content: string, node: Node) => {
                const element = node as HTMLElement;
                const styleAttr = element.getAttribute('style') || '';
                // Menangkap satuan pt, px, em, maupun rem secara defensif
                const fontMatch = styleAttr.match(/font-size:\s*([\d.]+(?:pt|px|em|rem))/i);

                if (fontMatch) {
                    const size = fontMatch[1];
                    // Kembalikan sebagai span inline murni agar aman terekam dalam format draf Markdown DB
                    return `<span style="font-size: ${size}">${content}</span>`;
                }
                return content;
            }
        });

        /**
         * ATURAN KUSTOM 4: Konversi Tabel HTML ke Markdown (GFM Compliant)
         */
        service.addRule('tableCellRule', {
            filter: ['th', 'td'],
            replacement: (content: string) => {
                const cleanContent = content.replace(/\|/g, '\\|').trim().replace(/\s+/g, ' ');
                return `${cleanContent} | `;
            }
        });

        service.addRule('tableRowRule', {
            filter: ['tr'],
            replacement: (content: string, node: Node) => {
                const element = node as HTMLElement;
                const parent = element.parentElement;

                const isHeader = element.querySelector('th') !== null ||
                    parent?.nodeName.toLowerCase() === 'thead' ||
                    (parent?.nodeName.toLowerCase() === 'tbody' && parent.firstElementChild === element && !parent.previousElementSibling);

                const trimmedContent = content.trim();
                if (!trimmedContent) return '';

                let separator = '';
                if (isHeader) {
                    const cellCount = element.querySelectorAll('th, td').length;
                    const sepCells = Array(cellCount).fill('---');
                    separator = `\n| ${sepCells.join(' | ')} |`;
                }

                return `\n| ${trimmedContent}${separator}`;
            }
        });

        service.addRule('tableRule', {
            filter: ['table'],
            replacement: (content: string, node: Node) => {
                const element = node as HTMLElement;
                const widthsAttr = element.getAttribute('data-widths');
                const rowHeightsAttr = element.getAttribute('data-row-heights');

                let widthsComment = '';
                if (widthsAttr) {
                    widthsComment = `<!-- table-widths: ${widthsAttr} -->\n`;
                }

                let rowHeightsComment = '';
                if (rowHeightsAttr) {
                    rowHeightsComment = `<!-- table-row-heights: ${rowHeightsAttr} -->\n`;
                }

                return `\n\n${widthsComment}${rowHeightsComment}${content.trim()}\n\n`;
            }
        });

        service.addRule('tableSectionRule', {
            filter: ['thead', 'tbody', 'tfoot'],
            replacement: (content: string) => {
                return content;
            }
        });

        this.turndownService = service;
        return this.turndownService;
    }

    /**
     * Mengonversi naskah Markdown bersih dari database menjadi HTML dengan inline styles
     * agar dapat dipahami dan dirender secara visual oleh TipTap Editor.
     * 
     * @param markdown String naskah Markdown dari database
     * @returns String HTML bersih dengan format perataan paragraf (CSS inline style)
     */
    public static toHTML(markdown: string): string {
        if (!markdown || markdown.trim().length === 0) {
            return '';
        }

        try {
            // Bersihkan token sitasi RAG lokal (misal: [doc1:1] atau [uuid:chunkIdx]) agar tidak tampil di editor naskah
            // PENTING: Jangan hapus sitasi URL web seperti [https://...] karena itu ditampilkan sebagai badge sitasi
            let processedMarkdown = markdown.replace(/\\\*?\[(?!https?:\/\/)(?:[a-f0-9-]{8,}|doc(?:[-_a-z0-9]+)?):\d+\\\*?\]/gi, '');

            // LINDUNGI sitasi URL web [https://...] dari diubah oleh marked.js menjadi <a href> standar
            // Caranya: ganti dengan placeholder sementara sebelum parsing, lalu kembalikan setelah parsing
            const urlCitationPlaceholders: string[] = [];
            processedMarkdown = processedMarkdown.replace(/\[(https?:\/\/[^\]\s]+?)(?::(\d+))?\]/g, (match) => {
                const idx = urlCitationPlaceholders.length;
                urlCitationPlaceholders.push(match);
                return `%%URLCITE_${idx}%%`;
            });

            // Tahap 1: Konversi tag div alignment pembungkus menjadi paragraf individu dengan inline style perataan
            processedMarkdown = processedMarkdown.replace(
                /<div align="(left|center|right|justify)">([\s\S]*?)<\/div>/gi,
                (_, align, content) => {
                    const paragraphs = content.split(/\r?\n\s*\r?\n/);
                    return paragraphs
                        .map((p: string) => {
                            const trimmed = p.trim();
                            if (!trimmed) return '';
                            // Jika sudah berwujud tag HTML block, biarkan
                            if (trimmed.startsWith('<p') || trimmed.startsWith('<h') || trimmed.startsWith('<div')) {
                                return trimmed;
                            }
                            // Jika merupakan list markdown atau header, biarkan untuk di-parse oleh marked
                            if (trimmed.startsWith('#') || trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.match(/^\d+\.\s/)) {
                                return trimmed;
                            }
                            return `<p style="text-align: ${align.toLowerCase()}">${trimmed}</p>`;
                        })
                        .filter(Boolean)
                        .join('\n\n');
                }
            );

            // Tahap 2: Lakukan pembersihan format spasi berlebih
            processedMarkdown = processedMarkdown.replace(/\r\n/g, '\n');

            // Tahap 3: Parsing string menggunakan mesin marked secara sinkronus
            let rawHtml = marked.parse(processedMarkdown, {
                async: false,
                breaks: true, // Menjaga perpindahan baris manual
                gfm: true,    // Mengaktifkan GitHub Flavored Markdown
            }) as string;

            // Kembalikan placeholder sitasi URL ke token aslinya setelah HTML terbentuk
            urlCitationPlaceholders.forEach((original, idx) => {
                rawHtml = rawHtml.replace(`%%URLCITE_${idx}%%`, original);
            });

            const normalizedHtml = this.normalizePunctuationSpacing(rawHtml);

            // Pasca-proses untuk menyuntikkan lebar kolom berdasarkan komentar
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(rawHtml, 'text/html');

                const iterator = doc.createNodeIterator(doc.body, NodeFilter.SHOW_COMMENT);
                let commentNode;

                while ((commentNode = iterator.nextNode())) {
                    const commentText = commentNode.nodeValue || '';
                    const widthsMatch = commentText.match(/table-widths:\s*(\[[\d,\s]+\])/i);
                    const rowHeightsMatch = commentText.match(/table-row-heights:\s*(\[[\d,\s]+\])/i);

                    if (widthsMatch || rowHeightsMatch) {
                        try {
                            const widths = widthsMatch ? JSON.parse(widthsMatch[1]) as number[] : [];
                            const rowHeights = rowHeightsMatch ? JSON.parse(rowHeightsMatch[1]) as number[] : [];
                            let sibling = commentNode.nextSibling;
                            let foundTable: HTMLTableElement | null = null;

                            while (sibling) {
                                if (sibling.nodeName.toLowerCase() === 'table') {
                                    foundTable = sibling as HTMLTableElement;
                                    break;
                                }
                                if (sibling.nodeType === Node.ELEMENT_NODE) {
                                    foundTable = (sibling as HTMLElement).querySelector('table');
                                    if (foundTable) break;
                                }
                                sibling = sibling.nextSibling;
                            }

                            if (foundTable) {
                                if (widths.length > 0) {
                                    let colgroup = foundTable.querySelector('colgroup');
                                    if (!colgroup) {
                                        colgroup = doc.createElement('colgroup');
                                        foundTable.insertBefore(colgroup, foundTable.firstChild);
                                    } else {
                                        colgroup.innerHTML = '';
                                    }

                                    widths.forEach((w) => {
                                        const col = doc.createElement('col');
                                        if (w > 0) {
                                            col.setAttribute('style', `width: ${w}px`);
                                        }
                                        colgroup!.appendChild(col);
                                    });
                                }

                                if (rowHeights.length > 0) {
                                    const rows = Array.from(foundTable.rows);
                                    rows.forEach((row, index) => {
                                        const height = rowHeights[index];
                                        if (height && height > 0) {
                                            row.setAttribute('style', `height: ${height}px`);
                                        }
                                    });
                                }
                            }
                        } catch (jsonErr) {
                            console.warn('[MarkupConverter] Gagal melakukan parse JSON untuk lebar kolom atau tinggi baris:', jsonErr);
                        }
                    }
                }
                return doc.body.innerHTML.trim();
            } catch (domErr) {
                console.warn('[MarkupConverter] DOMParser gagal menyuntikkan lebar tabel:', domErr);
                return normalizedHtml.trim();
            }
        } catch (err: any) {
            console.error('[MarkupConverter ERROR] Gagal mengonversi Markdown ke HTML:', err.message);
            // Fallback aman: kembalikan teks polos yang aman jika parsing fatal
            return `<p>${markdown}</p>`;
        }
    }

    /**
     * Mengonversi konten HTML semantik dari TipTap editor menjadi Markdown CommonMark bersih
     * sebelum disinkronkan dan disimpan ke database PostgreSQL.
     * 
     * @param html String HTML semantik hasil ekstraksi TipTap (editor.getHTML())
     * @returns String Markdown bersih yang bebas dari tag visual kustom HTML
     */
    public static toMarkdown(html: string): string {
        if (!html || html.trim().length === 0) {
            return '';
        }

        try {
            // Pindai HTML menggunakan DOMParser untuk mengekstrak lebar kolom tabel
            let processedHtml = html;
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const tables = doc.querySelectorAll('table');

                tables.forEach((table) => {
                    const colgroup = table.querySelector('colgroup');
                    const colWidths: number[] = [];
                    if (colgroup) {
                        const cols = colgroup.querySelectorAll('col');
                        cols.forEach((col) => {
                            const styleAttr = col.getAttribute('style') || '';
                            const match = styleAttr.match(/width:\s*([\d.]+)px/i);
                            if (match) {
                                colWidths.push(Math.round(parseFloat(match[1])));
                            } else {
                                colWidths.push(0);
                            }
                        });
                    } else {
                        const firstRowCells = table.querySelectorAll('tr:first-child th, tr:first-child td');
                        firstRowCells.forEach((cell) => {
                            const styleAttr = (cell as HTMLElement).getAttribute('style') || '';
                            const match = styleAttr.match(/width:\s*([\d.]+)px/i);
                            if (match) {
                                colWidths.push(Math.round(parseFloat(match[1])));
                            } else {
                                colWidths.push(0);
                            }
                        });
                    }

                    const hasCustomWidths = colWidths.some(w => w > 0);
                    if (hasCustomWidths) {
                        table.setAttribute('data-widths', JSON.stringify(colWidths));
                    }

                    const rowHeights: number[] = [];
                    table.querySelectorAll('tr').forEach((row) => {
                        const styleAttr = row.getAttribute('style') || '';
                        const match = styleAttr.match(/height:\s*([\d.]+)px/i);
                        if (match) {
                            rowHeights.push(Math.round(parseFloat(match[1])));
                        } else {
                            rowHeights.push(0);
                        }
                    });

                    if (rowHeights.some(h => h > 0)) {
                        table.setAttribute('data-row-heights', JSON.stringify(rowHeights));
                    }
                });
                processedHtml = doc.body.innerHTML;
            } catch (domErr) {
                console.warn('[MarkupConverter] DOMParser gagal mengekstrak lebar kolom tabel:', domErr);
            }

            const turndown = this.getTurndownInstance();
            const rawMarkdown = turndown.turndown(processedHtml);

            // Tahap Normalisasi Akhir: Bersihkan tumpukan baris kosong berlebih (maksimal 2 baris kosong berurutan)
            const sanitizedMarkdown = this.normalizePunctuationSpacing(
                rawMarkdown
                    .replace(/\n{3,}/g, '\n\n')
                    .replace(/&nbsp;/g, ' ') // Konversi entitas non-breaking space menjadi spasi normal
                    .replace(/\\([\[\]])/g, '$1') // Unescape bracket characters (e.g. \[doc1:13\] -> [doc1:13])
                    .trim()
            );

            return sanitizedMarkdown;
        } catch (err: any) {
            console.error('[MarkupConverter ERROR] Gagal mengonversi HTML ke Markdown:', err.message);
            // Fallback aman: kembalikan teks mentah
            return html;
        }
    }
}