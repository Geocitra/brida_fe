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
         * ATURAN KUSTOM 0 [Information Expert]: Preservasi CitationUrlNode → Markdown
         *
         * Ketika TipTap menghasilkan HTML dari CitationUrlNode (<span data-citation-url="...">),
         * Turndown WAJIB mengonversinya kembali ke format token Markdown asli [https://...].
         * Ini menjamin roundtrip sempurna: DB → editor → DB tanpa kehilangan data.
         *
         * PENTING: Rule ini didaftarkan PERTAMA karena Turndown menerapkan rules secara LIFO
         * (rule terakhir menang). Dengan urutan ini, sitasi URL selalu ditangkap lebih awal
         * sebelum rule span generic menghapus attributnya.
         */
        service.addRule('citationUrlPreservationRule', {
            filter: (node: HTMLElement) => {
                return (
                    node.nodeName.toLowerCase() === 'span' &&
                    node.getAttribute('data-citation-url') !== null
                );
            },
            replacement: (_content: string, node: Node) => {
                const element = node as HTMLElement;
                const url = element.getAttribute('data-citation-url') || '';
                // Kembalikan ke format token Markdown asli yang disimpan di database
                return url ? `[${url}]` : '';
            },
        });

        /**
         * ATURAN KUSTOM: Hapus AutoPageSpacer saat konversi HTML -> Markdown
         */
        service.addRule('autoPageSpacerRule', {
            filter: (node: HTMLElement) => {
                return (
                    node.getAttribute('data-auto-page-spacer') !== null ||
                    node.classList.contains('no-print') && node.hasAttribute('data-auto-page-spacer')
                );
            },
            replacement: () => '',
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
                    return `\n\n${content}\n\n`;
                }

                // Bungkus konten paragraf dengan tag div pembatas alignment yang CommonMark-compliant
                return `\n\n<div align="${alignment}">\n\n${content}\n\n</div>\n\n`;
            },
        });

        /**
         * ATURAN KUSTOM 2 [Information Expert]: Preservasi Token Sitasi Dokumen [doc-XYZ:chunkIndex]
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
                // Pastikan bukan CitationUrlNode — sudah ditangani rule 0
                const hasCitationUrl = node.getAttribute('data-citation-url') !== null;
                return tagName === 'span' && styleAttr.includes('font-size') && !hasCitationUrl;
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
         * ATURAN KUSTOM 7 [Roundtrip Safety]: Preservasi Dimensi Gambar (Width/Height)
         * Mencegah Turndown melucuti atribut inline CSS "style='width: ...'" atau atribut "width" pada gambar.
         */
        service.addRule('imageStyleRule', {
            filter: ['img'],
            replacement: (content: string, node: Node) => {
                const element = node as HTMLElement;
                const src = element.getAttribute('src') || '';
                const alt = element.getAttribute('alt') || '';
                const styleAttr = element.getAttribute('style') || '';
                
                // Cari apakah ada inline style width
                const widthMatch = styleAttr.match(/width:\s*([\d.%]+)/i);
                const heightMatch = styleAttr.match(/height:\s*([\d.%a-z]+)/i);
                
                let inlineStyle = '';
                if (widthMatch) {
                    inlineStyle += `width: ${widthMatch[1]};`;
                }
                if (heightMatch) {
                    inlineStyle += `height: ${heightMatch[1]};`;
                }
                
                const styleString = inlineStyle ? ` style="${inlineStyle}"` : '';
                const altAttr = alt ? ` alt="${alt}"` : '';
                
                // Kembalikan sebagai tag img HTML murni di Markdown agar tersimpan aman di DB
                return `<img src="${src}"${altAttr}${styleString} />`;
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

        /**
         * ATURAN KUSTOM 5 [Roundtrip Safety]: Normalisasi <br> menjadi pemisah paragraf
         *
         * TipTap dengan `breaks: true` menghasilkan <br> di dalam <p> untuk baris baru manual.
         * Turndown secara default mengonversi <br> menjadi \n tunggal — ini menyebabkan
         * paragraf bergabung saat dimuat ulang karena Markdown butuh \n\n antar blok.
         *
         * Solusi: Handle <br> eksplisit agar tidak menjadi noise saat roundtrip.
         */
        service.addRule('lineBreakRule', {
            filter: ['br'],
            replacement: () => {
                // Kembalikan sebagai single newline. Paragraf sudah dipisahkan oleh rule <p>.
                return '\n';
            }
        });

        this.turndownService = service;
        return this.turndownService;
    }

    /**
     * Mengonversi naskah Markdown bersih dari database menjadi HTML dengan inline styles
     * agar dapat dipahami dan dirender secara visual oleh TipTap Editor.
     *
     * Logika utama:
     * 1. Strip token sitasi RAG lokal [doc-uuid:idx] agar tidak tampil sebagai noise
     * 2. Konversi token sitasi URL [https://...] → elemen <span data-citation-url> interaktif
     * 3. Parse Markdown → HTML via marked.js
     * 4. Inject lebar kolom tabel dari komentar metadata
     *
     * @param markdown String naskah Markdown dari database
     * @returns String HTML bersih dengan format perataan paragraf (CSS inline style)
     */
    public static toHTML(markdown: string): string {
        if (!markdown || markdown.trim().length === 0) {
            return '';
        }

        try {
            // ====================================================================
            // TAHAP 1: Strip token sitasi RAG lokal yang tidak perlu tampil di editor
            // Format yang di-strip: [doc-uuid:0], [doc-abc123:5], \*[doc-xyz:1]\*
            // Format yang DILINDUNGI: [https://...] (ditangani di tahap 2)
            // ====================================================================
            let processedMarkdown = markdown
                // Strip dengan atau tanpa escape backslash dan asterisk (varian legacy)
                .replace(/\\?\*?\[(?!https?:\/\/)(?:[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}|doc(?:[-_a-z0-9]*)):\d+\]\\?\*?/gi, '')
                // Strip format alternatif tanpa UUID penuh: [doc-123:0]
                .replace(/\[doc[-_][a-z0-9]+:\d+\]/gi, '')
                // Bersihkan spasi berlebih yang mungkin tertinggal setelah strip
                .replace(/\s{2,}(?=[.,;:!?])/g, '');

            // ====================================================================
            // TAHAP 2: Lindungi token sitasi URL web dari parsing oleh marked.js
            //
            // Marked.js akan mengubah [https://...] menjadi <a href> standar,
            // tapi kita ingin merender ini sebagai CitationUrlNode chip, bukan <a>.
            //
            // Strategi: ganti dengan placeholder sementara → parse → kembalikan
            // sebagai elemen <span data-citation-url> yang akan diparsing TipTap
            // sebagai CitationUrlNode (atom, non-editable, clickable).
            // ====================================================================
            const collectedCitations: string[] = [];

            processedMarkdown = processedMarkdown.replace(
                /\[(https?:\/\/[^\]\s]+?)(?::\d+)?\]/g,
                (match, url) => {
                    const idx = collectedCitations.length;
                    collectedCitations.push(url);
                    return `%%URLCITE_${idx}%%`;
                }
            );

            // ====================================================================
            // TAHAP 3: Konversi tag div alignment pembungkus menjadi paragraf individu
            // ====================================================================
            processedMarkdown = processedMarkdown.replace(
                /<div align="(left|center|right|justify)">([\s\S]*?)<\/div>/gi,
                (_, align, content) => {
                    const paragraphs = content.split(/\r?\n\s*\r?\n/);
                    return paragraphs
                        .map((p: string) => {
                            const trimmed = p.trim();
                            if (!trimmed) return '';
                            if (trimmed.startsWith('<p') || trimmed.startsWith('<h') || trimmed.startsWith('<div')) {
                                return trimmed;
                            }
                            if (trimmed.startsWith('#') || trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.match(/^\d+\.\s/)) {
                                return trimmed;
                            }
                            return `<p style="text-align: ${align.toLowerCase()}">${trimmed}</p>`;
                        })
                        .filter(Boolean)
                        .join('\n\n');
                }
            );

            // Normalisasi line endings
            processedMarkdown = processedMarkdown.replace(/\r\n/g, '\n');

            // ====================================================================
            // TAHAP 4: Parse Markdown → HTML menggunakan marked.js
            // ====================================================================
            let rawHtml = marked.parse(processedMarkdown, {
                async: false,
                breaks: true,
                gfm: true,
            }) as string;

            // ====================================================================
            // TAHAP 5: Kembalikan placeholder URL ke elemen <span data-citation-url>
            //
            // Elemen ini akan diparsing oleh TipTap sebagai CitationUrlNode karena
            // extension tersebut mendengarkan parseHTML() pada 'span[data-citation-url]'.
            //
            // Label "Link N" ditampilkan — URL asli tersimpan aman di data-citation-url.
            // Class `no-print` memastikan chip ini tidak muncul di export PDF.
            // ====================================================================
            collectedCitations.forEach((url, idx) => {
                const labelText = `Link ${idx + 1}`;
                const citationSpan = `<span data-citation-url="${url}" data-citation-label="${labelText}" class="citation-url-node no-print" contenteditable="false" title="${url}">${labelText}</span>`;
                rawHtml = rawHtml.replace(`%%URLCITE_${idx}%%`, citationSpan);
            });

            const normalizedHtml = this.normalizePunctuationSpacing(rawHtml);

            // ====================================================================
            // TAHAP 6: Pasca-proses — inject lebar kolom tabel dari komentar metadata
            // ====================================================================
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(normalizedHtml, 'text/html');

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

                // ====================================================================
                // TAHAP 7: Default Colgroup untuk tabel yang tidak memiliki kustom lebar
                // Menggunakan piksel absolut (total 606px) agar kompatibel dengan TipTap
                // resizable table dan otomatis terbentang lebar penuh halaman A4.
                // ====================================================================
                const tables = doc.querySelectorAll('table');
                tables.forEach((table) => {
                    const colgroup = table.querySelector('colgroup');
                    if (!colgroup) {
                        const firstRow = table.querySelector('tr');
                        if (firstRow) {
                            const cells = firstRow.querySelectorAll('th, td');
                            const colCount = cells.length;
                            if (colCount > 0) {
                                const newColgroup = doc.createElement('colgroup');
                                // Total lebar area cetak halaman A4 = 606px (794px - margin kiri/kanan 94px)
                                const totalWidth = 606;
                                const baseColWidth = Math.floor(totalWidth / colCount);
                                const remainder = totalWidth % colCount;

                                for (let i = 0; i < colCount; i++) {
                                    const col = doc.createElement('col');
                                    // Sisa pembagian ditambahkan ke kolom terakhir
                                    const w = i === colCount - 1 ? baseColWidth + remainder : baseColWidth;
                                    col.setAttribute('style', `width: ${w}px`);
                                    newColgroup.appendChild(col);
                                }
                                table.insertBefore(newColgroup, table.firstChild);
                            }
                        }
                    }
                    // Paksa table style memiliki width 606px agar pas di halaman A4
                    table.setAttribute('style', 'width: 606px');
                });

                return doc.body.innerHTML.trim();
            } catch (domErr) {
                console.warn('[MarkupConverter] DOMParser gagal menyuntikkan lebar tabel:', domErr);
                return normalizedHtml.trim();
            }
        } catch (err: any) {
            console.error('[MarkupConverter ERROR] Gagal mengonversi Markdown ke HTML:', err.message);
            return `<p>${markdown}</p>`;
        }
    }

    /**
     * Mengonversi konten HTML semantik dari TipTap editor menjadi Markdown CommonMark bersih
     * sebelum disinkronkan dan disimpan ke database PostgreSQL.
     *
     * Logika utama:
     * 1. Ekstrak lebar kolom tabel dari <colgroup> sebelum Turndown membuangnya
     * 2. Turndown converts HTML → Markdown
     * 3. CitationUrlNode (<span data-citation-url>) → [https://...] (via rule 0)
     * 4. Normalisasi akhir: hapus baris kosong berlebih, unescape bracket
     *
     * @param html String HTML semantik hasil ekstraksi TipTap (editor.getHTML())
     * @returns String Markdown bersih yang bebas dari tag visual kustom HTML
     */
    public static toMarkdown(html: string): string {
        if (!html || html.trim().length === 0) {
            return '';
        }

        try {
            // ====================================================================
            // TAHAP 1: Pre-proses HTML — ekstrak metadata tabel sebelum Turndown
            // ====================================================================
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

            // ====================================================================
            // TAHAP 2: Turndown HTML → Markdown
            //
            // Rule 0 (citationUrlPreservationRule) secara otomatis mengonversi
            // <span data-citation-url="..."> kembali ke [https://...] untuk DB.
            // ====================================================================
            const turndown = this.getTurndownInstance();
            const rawMarkdown = turndown.turndown(processedHtml);

            // ====================================================================
            // TAHAP 3: Normalisasi akhir
            // ====================================================================
            const sanitizedMarkdown = this.normalizePunctuationSpacing(
                rawMarkdown
                    // Maksimal 2 baris kosong berurutan (1 paragraf pemisah)
                    .replace(/\n{3,}/g, '\n\n')
                    // Konversi entitas non-breaking space menjadi spasi normal
                    .replace(/&nbsp;/g, ' ')
                    // Unescape bracket agar sitasi dokumen kembali bersih: \[doc1:13\] → [doc1:13]
                    .replace(/\\([\[\]])/g, '$1')
                    .trim()
            );

            return sanitizedMarkdown;
        } catch (err: any) {
            console.error('[MarkupConverter ERROR] Gagal mengonversi HTML ke Markdown:', err.message);
            return html;
        }
    }
}