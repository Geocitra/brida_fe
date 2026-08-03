import { Node, mergeAttributes } from '@tiptap/core';

/**
 * TIPTAP EXTENSION: CitationUrlNode
 *
 * [GRASP - Information Expert & Protected Variations]
 *
 * Tujuan:
 * - Merender token sitasi URL web [https://...] dari Markdown sebagai chip interaktif
 *   yang non-editable dan bisa diklik di dalam editor TipTap.
 * - Menyimpan URL lengkap di attribute `data-citation-url` agar tidak pernah hilang.
 * - Menampilkan label pendek "Link N" (berurutan) agar tidak memenuhi body artikel.
 * - Class `no-print` memastikan chip ini TIDAK muncul di export PDF.
 *
 * Siklus Konversi:
 *   DB (Markdown)  →  toHTML()  → <span data-citation-url="..."> → TipTap CitationUrlNode
 *   CitationUrlNode → toMarkdown() → [https://...]  →  DB (Markdown bersih)
 */
export const CitationUrlNode = Node.create({
    name: 'citationUrl',
    group: 'inline',
    inline: true,
    atom: true,   // atom=true: node diperlakukan sebagai satu unit, tidak bisa edit per karakter

    addAttributes() {
        return {
            url: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-citation-url'),
                renderHTML: (attributes) => ({
                    'data-citation-url': attributes.url,
                }),
            },
            label: {
                default: 'Link',
                parseHTML: (element) => element.getAttribute('data-citation-label') || element.textContent || 'Link',
                renderHTML: (attributes) => ({
                    'data-citation-label': attributes.label,
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                // Parsing dari HTML output toHTML() yang dihasilkan oleh MarkupConverter
                tag: 'span[data-citation-url]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(HTMLAttributes, {
                // Class utama untuk styling, cursor pointer, dan hidden dari print/PDF
                class: 'citation-url-node no-print',
                // Aksi klik membuka URL di tab baru — diset via onclick inline
                // karena TipTap atom node tidak propagate event React secara normal
                onclick: `(function(e){ e.preventDefault(); e.stopPropagation(); var u="${HTMLAttributes['data-citation-url'] || ''}"; if(u) window.open(u, '_blank', 'noopener,noreferrer'); })(event)`,
                title: HTMLAttributes['data-citation-url'] || 'Tautan Sitasi',
                contenteditable: 'false',
                // Sembunyikan dari aksesibilitas screen reader karena hanya dekoratif
                'aria-label': `Sitasi: ${HTMLAttributes['data-citation-label'] || 'Link'}`,
            }),
            // Teks yang ditampilkan: label pendek (misal: "Link 1")
            HTMLAttributes['data-citation-label'] || 'Link',
        ];
    },

    // Tidak ada content karena ini atom node
});
