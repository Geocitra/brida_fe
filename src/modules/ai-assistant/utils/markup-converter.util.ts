import { marked } from 'marked';
import TurndownService from 'turndown';

export class MarkupConverter {
    private static turndownService: TurndownService | null = null;

    private static normalizePunctuationSpacing(text: string): string {
        return text.replace(/\s+([,.;:!?])/g, '$1');
    }

    private static getTurndownInstance(): TurndownService {
        if (this.turndownService) {
            return this.turndownService;
        }

        const service = new TurndownService({
            headingStyle: 'atx',
            hr: '---',
            bulletListMarker: '-',
            codeBlockStyle: 'fenced',
            emDelimiter: '*',
            strongDelimiter: '**',
        });

        // 1. Aturan Sitasi URL Interaktif
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
                return url ? `[${url}]` : '';
            },
        });

        // 2. Aturan Blockquote Callout
        service.addRule('blockquoteRule', {
            filter: 'blockquote',
            replacement: (content: string) => {
                const clean = content.trim().replace(/\n+/g, '\n> ');
                return `\n\n> ${clean}\n\n`;
            },
        });

        // 3. Aturan Alignment Paragraf
        service.addRule('textAlignRule', {
            filter: (node: HTMLElement) => {
                const tagName = node.nodeName.toLowerCase();
                const styleAttr = node.getAttribute('style') || '';
                const alignAttr = node.getAttribute('align') || '';
                const isInsideTableOrList = node.closest('li, td, th') !== null;

                return (
                    ['p', 'div', 'h1', 'h2', 'h3'].includes(tagName) &&
                    (styleAttr.includes('text-align') || alignAttr) &&
                    !isInsideTableOrList
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
                    const match = styleAttr.match(/text-align:\s*(left|center|right|justify)/i);
                    if (match) alignment = match[1].toLowerCase();
                }

                if (alignment === 'left') return `\n\n${content}\n\n`;
                return `\n\n<div align="${alignment}">\n\n${content}\n\n</div>\n\n`;
            },
        });

        // 4. Aturan Tabel GFM Bersih (Tanpa Injeksi Komentar Metadata)
        service.addRule('tableCellRule', {
            filter: ['th', 'td'],
            replacement: (content: string) => {
                const cleanContent = content.replace(/\|/g, '\\|').trim().replace(/\s+/g, ' ');
                return `${cleanContent} | `;
            },
        });

        service.addRule('tableRowRule', {
            filter: 'tr',
            replacement: (content: string, node: Node) => {
                const element = node as HTMLElement;
                const parent = element.parentElement;
                const isHeader =
                    element.querySelector('th') !== null ||
                    parent?.nodeName.toLowerCase() === 'thead' ||
                    (parent?.nodeName.toLowerCase() === 'tbody' &&
                        parent.firstElementChild === element &&
                        !parent.previousElementSibling);

                const trimmed = content.trim();
                if (!trimmed) return '';

                let separator = '';
                if (isHeader) {
                    const cellCount = element.querySelectorAll('th, td').length;
                    const sepCells = Array(Math.max(1, cellCount)).fill('---');
                    separator = `\n| ${sepCells.join(' | ')} |`;
                }

                return `\n| ${trimmed}${separator}`;
            },
        });

        service.addRule('tableRule', {
            filter: 'table',
            replacement: (content: string) => {
                return `\n\n${content.trim()}\n\n`;
            },
        });

        service.addRule('tableSectionRule', {
            filter: ['thead', 'tbody', 'tfoot'],
            replacement: (content: string) => content,
        });

        this.turndownService = service;
        return this.turndownService;
    }

    /**
     * Mengonversi Markdown AI menjadi HTML TipTap-Safe.
     * Hanya dijalankan SEKALI saat inisialisasi draf dari AI ke Editor.
     */
    public static toHTML(markdown: string): string {
        if (!markdown || markdown.trim().length === 0) {
            return '';
        }

        try {
            let processedMarkdown = markdown
                .replace(/\\?\*?\[(?!https?:\/\/)(?:[a-f0-9-]{8,}|doc(?:[-_a-z0-9]*)):\d+\]\\?\*?/gi, '')
                .replace(/\s{2,}(?=[.,;:!?])/g, '');

            const collectedCitations: string[] = [];
            processedMarkdown = processedMarkdown.replace(
                /\[(https?:\/\/[^\]\s]+?)(?::\d+)?\]/g,
                (_, url) => {
                    const idx = collectedCitations.length;
                    collectedCitations.push(url);
                    return `%%URLCITE_${idx}%%`;
                },
            );

            // Parsing Markdown menggunakan standard CommonMark/GFM
            let rawHtml = marked.parse(processedMarkdown, {
                async: false,
                breaks: true,
                gfm: true,
            }) as string;

            // Kembalikan node sitasi URL
            collectedCitations.forEach((url, idx) => {
                const labelText = `Link ${idx + 1}`;
                const citationSpan = `<span data-citation-url="${url}" data-citation-label="${labelText}" class="citation-url-node no-print" contenteditable="false" title="${url}">${labelText}</span>`;
                rawHtml = rawHtml.replace(`%%URLCITE_${idx}%%`, citationSpan);
            });

            return this.normalizePunctuationSpacing(rawHtml.trim());
        } catch (err: any) {
            console.error('[MarkupConverter] Gagal mengonversi Markdown ke HTML:', err.message);
            return `<p>${markdown}</p>`;
        }
    }

    /**
     * Mengekspor HTML TipTap ke format Markdown jika dibutuhkan untuk unduhan teks.
     */
    public static toMarkdown(html: string): string {
        if (!html || html.trim().length === 0) {
            return '';
        }

        try {
            const turndown = this.getTurndownInstance();
            const rawMarkdown = turndown.turndown(html);

            return this.normalizePunctuationSpacing(
                rawMarkdown
                    .replace(/\n{3,}/g, '\n\n')
                    .replace(/&nbsp;/g, ' ')
                    .trim(),
            );
        } catch (err: any) {
            console.error('[MarkupConverter] Gagal mengonversi HTML ke Markdown:', err.message);
            return html;
        }
    }
}