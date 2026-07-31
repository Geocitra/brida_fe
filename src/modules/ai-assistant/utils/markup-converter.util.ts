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

                return (
                    ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName) &&
                    (hasStyleAlign || hasAlignAttr)
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

                // Jika perataan teks adalah default kiri (left), kembalikan sebagai paragraf polos
                if (alignment === 'left') {
                    return `\n\n${content}\n\n`;
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
            // Bersihkan token sitasi RAG (misal: [doc1:1] atau \\\\\\\\\\\\[doc1:1\\\\\\\\\\\\]) agar tidak tampil di editor naskah
            let processedMarkdown = markdown.replace(/\\*\[(?:[a-f0-9-]{8,}|doc(?:[-_a-z0-9]+)?):\d+\\*\]/gi, '');

            // Tahap 1: Konversi tag div alignment pembungkus menjadi paragraf individu dengan inline style perataan
            processedMarkdown = processedMarkdown.replace(
                /<div align="(left|center|right|justify)">([\s\S]*?)<\/div>/gi,
                (_, align, content) => {
                    const paragraphs = content.split(/\r?\n\s*\r?\n/);
                    return paragraphs
                        .map(p => {
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
            const rawHtml = marked.parse(processedMarkdown, {
                async: false,
                breaks: true, // Menjaga perpindahan baris manual
                gfm: true,    // Mengaktifkan GitHub Flavored Markdown
            }) as string;

            return rawHtml.trim();
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
            const turndown = this.getTurndownInstance();
            const rawMarkdown = turndown.turndown(html);

            // Tahap Normalisasi Akhir: Bersihkan tumpukan baris kosong berlebih (maksimal 2 baris kosong berurutan)
            const sanitizedMarkdown = rawMarkdown
                .replace(/\n{3,}/g, '\n\n')
                .replace(/&nbsp;/g, ' ') // Konversi entitas non-breaking space menjadi spasi normal
                .replace(/\\([\[\]])/g, '$1') // Unescape bracket characters (e.g. \[doc1:13\] -> [doc1:13])
                .trim();

            return sanitizedMarkdown;
        } catch (err: any) {
            console.error('[MarkupConverter ERROR] Gagal mengonversi HTML ke Markdown:', err.message);
            // Fallback aman: kembalikan teks mentah
            return html;
        }
    }
}