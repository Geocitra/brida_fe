import { marked } from 'marked';
import TurndownService from 'turndown';
import { jsonrepair } from 'jsonrepair';

const VALID_CHART_TYPES = [
    'bar',
    'line',
    'pie',
    'doughnut',
    'radar',
    'polarArea',
    'scatter',
    'bubble',
];

export function normalizeChartConfig(parsed: any, altText: string = 'Visualisasi Grafik Data'): any {
    if (!parsed || typeof parsed !== 'object') {
        return createDefaultBarChart(altText);
    }

    let type = String(parsed.type || 'bar').trim();
    const lowerType = type.toLowerCase();

    if (!parsed.options || typeof parsed.options !== 'object') {
        parsed.options = {};
    }

    // 1. Tangani horizontalBar -> Pada Chart.js v3, horizontal bar adalah type 'bar' dengan indexAxis: 'y'
    if (lowerType === 'horizontalbar') {
        parsed.type = 'bar';
        parsed.options.indexAxis = 'y';
    } else if (VALID_CHART_TYPES.includes(lowerType)) {
        parsed.type = lowerType;
    } else {
        // 2. Tangani tipe tidak didukung Chart.js (misal 'flowchart', 'sankey', 'process')
        parsed.type = 'bar';
        parsed.options.indexAxis = 'y';

        if (!parsed.data || typeof parsed.data !== 'object') {
            parsed.data = {};
        }

        if (!Array.isArray(parsed.data.labels) || parsed.data.labels.length === 0) {
            if (Array.isArray(parsed.data.nodes) && parsed.data.nodes.length > 0) {
                parsed.data.labels = parsed.data.nodes.map(
                    (n: any, idx: number) => n.label || n.title || n.id || `Tahap ${idx + 1}`,
                );
            } else if (
                Array.isArray(parsed.data.datasets?.[0]?.data) &&
                parsed.data.datasets[0].data.length > 0
            ) {
                const firstItem = parsed.data.datasets[0].data[0];
                if (typeof firstItem === 'object' && firstItem !== null) {
                    const names = new Set<string>();
                    parsed.data.datasets[0].data.forEach((d: any) => {
                        if (d.from) names.add(String(d.from));
                        if (d.to) names.add(String(d.to));
                    });
                    parsed.data.labels = Array.from(names).slice(0, 6);
                }
            }
        }

        if (!Array.isArray(parsed.data.labels) || parsed.data.labels.length === 0) {
            parsed.data.labels = [
                'Tahap 1: Perencanaan & Regulasi',
                'Tahap 2: Sosialisasi & Koordinasi',
                'Tahap 3: Implementasi Lapangan',
                'Tahap 4: Monitoring & Evaluasi',
            ];
        }

        const labelCount = parsed.data.labels.length;
        const progressiveValues = [100, 85, 65, 45, 30, 20].slice(0, labelCount);
        while (progressiveValues.length < labelCount) {
            progressiveValues.push(50);
        }

        parsed.data.datasets = [
            {
                label: altText || 'Estimasi Progres Capaian (%)',
                data: progressiveValues,
                backgroundColor: [
                    '#0f766e',
                    '#0d9488',
                    '#14b8a6',
                    '#2dd4bf',
                    '#5eead4',
                    '#99f6e4',
                ].slice(0, labelCount),
            },
        ];
    }

    if (!parsed.data || typeof parsed.data !== 'object') {
        return createDefaultBarChart(altText);
    }

    if (!Array.isArray(parsed.data.labels) || parsed.data.labels.length === 0) {
        parsed.data.labels = ['Indikator 1', 'Indikator 2', 'Indikator 3'];
    }

    // Bersihkan label dari kurung '(' ')' dan ampersand '&' agar aman bagi parser Markdown CommonMark
    parsed.data.labels = parsed.data.labels.map((l: any) =>
        String(l || '')
            .replace(/[()]/g, '-')
            .replace(/&/g, 'dan')
            .trim(),
    );

    if (!Array.isArray(parsed.data.datasets) || parsed.data.datasets.length === 0) {
        parsed.data.datasets = [
            {
                label: altText || 'Visualisasi Data',
                data: [70, 85, 75],
                backgroundColor: ['#0d9488', '#14b8a6', '#2dd4bf'],
            },
        ];
    } else {
        parsed.data.datasets.forEach((ds: any) => {
            if (ds.label) {
                ds.label = String(ds.label)
                    .replace(/[()]/g, '-')
                    .replace(/&/g, 'dan')
                    .trim();
            }
            if (Array.isArray(ds.data)) {
                ds.data = ds.data.map((val: any) => {
                    if (typeof val === 'number') return val;
                    const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
                    return isNaN(num) ? 50 : num;
                });
            } else {
                ds.data = parsed.data.labels.map(() => 50);
            }
            if (!ds.backgroundColor) {
                ds.backgroundColor = ['#0f766e', '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4'];
            }
        });
    }

    parsed.options.responsive = true;
    if (!parsed.options.plugins || typeof parsed.options.plugins !== 'object') {
        parsed.options.plugins = {};
    }
    if (!parsed.options.plugins.legend) {
        parsed.options.plugins.legend = { display: true };
    }
    if (!parsed.options.plugins.title) {
        parsed.options.plugins.title = {
            display: true,
            text: altText || 'Visualisasi Data BRIDA',
        };
    }

    return parsed;
}

export function createDefaultBarChart(altText: string): any {
    return {
        type: 'bar',
        data: {
            labels: ['Indikator 1', 'Indikator 2', 'Indikator 3'],
            datasets: [
                {
                    label: altText || 'Visualisasi Data',
                    data: [70, 85, 75],
                    backgroundColor: ['#0d9488', '#14b8a6', '#2dd4bf'],
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true },
                title: { display: true, text: altText || 'Visualisasi Data' },
            },
        },
    };
}

function extractBalancedObject(
    str: string,
    startIndex: number,
): { objectStr: string; endIndex: number } | null {
    let depth = 0;
    let inString: string | null = null;
    let isEscaped = false;
    let objStart = -1;

    for (let i = startIndex; i < str.length; i++) {
        const char = str[i];

        if (inString) {
            if (isEscaped) {
                isEscaped = false;
            } else if (char === '\\') {
                isEscaped = true;
            } else if (char === inString) {
                inString = null;
            }
            continue;
        }

        if (char === '"' || char === "'" || char === '`') {
            inString = char;
            continue;
        }

        if (char === '{') {
            if (depth === 0) objStart = i;
            depth++;
        } else if (char === '}') {
            depth--;
            if (depth === 0 && objStart !== -1) {
                return {
                    objectStr: str.substring(objStart, i + 1),
                    endIndex: i + 1,
                };
            }
        }
    }

    if (objStart !== -1) {
        return {
            objectStr: str.substring(objStart),
            endIndex: str.length,
        };
    }

    return null;
}

function safelyDecodeChartConfig(rawInput: string): string {
    if (!rawInput) return '';
    let str = rawInput.trim();

    str = str
        .replace(/%7B/gi, '{')
        .replace(/%7D/gi, '}')
        .replace(/%5B/gi, '[')
        .replace(/%5D/gi, ']')
        .replace(/%3A/gi, ':')
        .replace(/%2C/gi, ',')
        .replace(/%22/gi, '"')
        .replace(/%27/gi, "'")
        .replace(/%20/gi, ' ')
        .replace(/%23/gi, '#')
        .replace(/%28/gi, '(')
        .replace(/%29/gi, ')')
        .replace(/%2F/gi, '/');

    try {
        str = decodeURIComponent(str);
    } catch {
        try {
            const fixed = str.replace(/%(?![0-9a-fA-F]{2})/g, '%25');
            str = decodeURIComponent(fixed);
        } catch {}
    }

    return str;
}

function safeUrlEncodeChartConfig(jsonStr: string): string {
    return encodeURIComponent(jsonStr)
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29')
        .replace(/'/g, '%27')
        .replace(/\*/g, '%2A');
}

export class MarkupConverter {
    private static turndownService: TurndownService | null = null;

    private static normalizePunctuationSpacing(text: string): string {
        return text.replace(/\s+([,.;:!?])/g, '$1');
    }

    /**
     * Sanitasi dan normalisasi satu URL QuickChart ke Chart.js v3 aman
     */
    public static sanitizeQuickChartUrl(rawUrl: string, fallbackTitle: string = 'Visualisasi Grafik'): string {
        if (!rawUrl || typeof rawUrl !== 'string') return '';
        let urlStr = rawUrl.trim();

        while (urlStr.startsWith('<') || urlStr.startsWith('(') || urlStr.startsWith('[') || urlStr.startsWith('"') || urlStr.startsWith("'")) {
            urlStr = urlStr.substring(1);
        }
        while (urlStr.endsWith('>') || urlStr.endsWith(')') || urlStr.endsWith(']') || urlStr.endsWith('"') || urlStr.endsWith("'")) {
            urlStr = urlStr.substring(0, urlStr.length - 1);
        }

        const qcMarker = 'quickchart.io/chart';
        const markerIdx = urlStr.toLowerCase().indexOf(qcMarker);
        if (markerIdx === -1) {
            return urlStr;
        }

        const queryStart = urlStr.indexOf('?', markerIdx);
        if (queryStart === -1) {
            return urlStr;
        }

        const queryString = urlStr.substring(queryStart + 1);
        const cParamMatch = queryString.match(/(?:^|&)(c|chart)=/i);
        if (!cParamMatch || cParamMatch.index === undefined) {
            return urlStr;
        }

        const afterParam = queryString.substring(cParamMatch.index + cParamMatch[0].length);
        let configStr = '';

        const braceOffset = afterParam.indexOf('{');
        const encodedBraceOffset = afterParam.search(/%7B/i);

        if (encodedBraceOffset !== -1 && (braceOffset === -1 || encodedBraceOffset < braceOffset)) {
            let paramEnd = afterParam.search(/[&\)\s\n\r"'>]/);
            if (paramEnd === -1) paramEnd = afterParam.length;
            const rawEncoded = afterParam.substring(0, paramEnd);
            const decoded = safelyDecodeChartConfig(rawEncoded);
            const b = extractBalancedObject(decoded, 0);
            if (b) configStr = b.objectStr;
        }

        if (!configStr && braceOffset !== -1) {
            const b = extractBalancedObject(afterParam, braceOffset);
            if (b) configStr = b.objectStr;
        }

        if (!configStr) {
            const decoded = safelyDecodeChartConfig(afterParam);
            const b = extractBalancedObject(decoded, 0);
            if (b) configStr = b.objectStr;
        }

        let finalConfigJson = '';
        if (configStr) {
            try {
                const repaired = jsonrepair(configStr);
                const parsed = JSON.parse(repaired);
                const normalized = normalizeChartConfig(parsed, fallbackTitle);
                finalConfigJson = JSON.stringify(normalized);
            } catch {
                finalConfigJson = JSON.stringify(createDefaultBarChart(fallbackTitle));
            }
        } else {
            finalConfigJson = JSON.stringify(createDefaultBarChart(fallbackTitle));
        }

        const safeEncoded = safeUrlEncodeChartConfig(finalConfigJson);
        return `https://quickchart.io/chart?v=3&c=${safeEncoded}&bkg=white&w=650&h=350&devicePixelRatio=2`;
    }

    /**
     * Sanitasi seluruh tag <img> QuickChart di dalam string HTML TipTap
     */
    public static sanitizeQuickChartHtml(html: string): string {
        if (!html || typeof html !== 'string') return '';
        return html.replace(/<img([^>]*?)src=["'](https?:\/\/[^"']*quickchart\.io\/chart[^"']*)["']([^>]*?)>/gi, (match, before, src, after) => {
            const altMatch = (before + after).match(/alt=["']([^"']*)["']/i);
            const altText = altMatch ? altMatch[1] : 'Visualisasi Grafik';
            const safeUrl = MarkupConverter.sanitizeQuickChartUrl(src, altText);
            return `<img${before}src="${safeUrl}"${after}>`;
        });
    }

    /**
     * Sanitasi dan normalisasi seluruh kemunculan QuickChart di dalam string Markdown.
     * Mengonversi format multi-line, tipe tidak valid (flowchart/sankey), serta memastikan URL Chart.js v3 aman.
     */
    public static sanitizeQuickChartMarkdown(markdown: string): string {
        if (!markdown || typeof markdown !== 'string') return '';

        let result = markdown;
        const qcMarker = 'quickchart.io/chart';
        let searchPos = 0;
        let iterations = 0;

        while (iterations++ < 50) {
            const foundIdx = result.toLowerCase().indexOf(qcMarker, searchPos);
            if (foundIdx === -1) break;

            const textBefore = result.substring(0, foundIdx);
            const httpMatch = textBefore.match(/(https?:\/\/)$/i);
            const httpStart = httpMatch ? foundIdx - httpMatch[0].length : foundIdx;

            let fullMatchStart = httpStart;
            let altText = 'Visualisasi Grafik Data';

            const textBeforeHttp = result.substring(0, httpStart);
            const lastImgOpen = textBeforeHttp.lastIndexOf('![');
            const lastLinkOpen = textBeforeHttp.lastIndexOf('[');
            const lastOpen = lastImgOpen !== -1 ? lastImgOpen : lastLinkOpen;

            if (lastOpen !== -1 && lastOpen >= textBeforeHttp.length - 300) {
                const candidate = textBeforeHttp.substring(lastOpen);
                const m = candidate.match(/^(!?\[([^\]]*)\]\s*\(\s*)$/);
                if (m) {
                    fullMatchStart = lastOpen;
                    if (m[2] && m[2].trim()) {
                        altText = m[2].trim().replace(/[\[\]]/g, '');
                    }
                }
            }

            let replaceEnd = httpStart;
            const lookahead = result.substring(httpStart);
            const isMarkdownImage = fullMatchStart < httpStart;
            let rawChunk = '';

            if (isMarkdownImage) {
                const braceIdx = lookahead.indexOf('{');
                const encodedBraceIdx = lookahead.search(/%7B/i);
                let balancedEnd = -1;

                if (braceIdx !== -1) {
                    const b = extractBalancedObject(lookahead, braceIdx);
                    if (b) balancedEnd = b.endIndex;
                } else if (encodedBraceIdx !== -1) {
                    const decoded = safelyDecodeChartConfig(lookahead);
                    const b = extractBalancedObject(decoded, 0);
                    if (b) balancedEnd = lookahead.search(/[&\)\s\n\r"'>]/);
                }

                if (balancedEnd !== -1) {
                    const afterBalanced = lookahead.substring(balancedEnd);
                    const closeParen = afterBalanced.indexOf(')');
                    if (closeParen !== -1 && closeParen < 300) {
                        replaceEnd = httpStart + balancedEnd + closeParen + 1;
                        rawChunk = lookahead.substring(0, balancedEnd + closeParen);
                    }
                }
            }

            if (!rawChunk) {
                const lineEnd = lookahead.search(/[\n\r]/);
                const lineChunk = lineEnd !== -1 ? lookahead.substring(0, lineEnd) : lookahead;
                rawChunk = lineChunk.trimEnd();
                const trailMatch = rawChunk.match(/[\)\]\>]+$/);
                if (trailMatch) {
                    rawChunk = rawChunk.substring(0, rawChunk.length - trailMatch[0].length);
                }
                replaceEnd = httpStart + lineChunk.length;
            }

            const safeUrl = MarkupConverter.sanitizeQuickChartUrl(rawChunk, altText);
            const replacement = `\n\n![${altText}](${safeUrl})\n\n`;

            result =
                result.substring(0, fullMatchStart) +
                replacement +
                result.substring(replaceEnd);
            searchPos = fullMatchStart + replacement.length;
        }

        return result;
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

                return Boolean(
                    ['p', 'div', 'h1', 'h2', 'h3'].includes(tagName) &&
                    (styleAttr.includes('text-align') || Boolean(alignAttr)) &&
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
        return service;
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
            // 1. PENYELAMAT QUICKCHART: Normalisasi seluruh QuickChart di markdown
            let processedMarkdown = MarkupConverter.sanitizeQuickChartMarkdown(markdown);

            // 2. Bersihkan token aneh dan spasi berlebih
            processedMarkdown = processedMarkdown
                .replace(/\\?\*?\[(?!https?:\/\/)(?:[a-f0-9-]{8,}|doc(?:[-_a-z0-9]*)):\d+\]\\?\*?/gi, '')
                .replace(/\s{2,}(?=[.,;:!?])/g, '');

            const collectedCitations: string[] = [];
            processedMarkdown = processedMarkdown.replace(
                /(?<!\!)\[(https?:\/\/(?!quickchart\.io)[^\]\s]+?)(?::\d+)?\]/g,
                (_: string, url: string) => {
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