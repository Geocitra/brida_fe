import { Node, mergeAttributes } from '@tiptap/core';

/**
 * AutoPageSpacer — Node atom tak-terlihat yang disisipkan otomatis
 * oleh mesin paginasi untuk mendorong konten ke halaman berikutnya.
 *
 * Cara kerja:
 *  - Ditempatkan antara dua blok ketika blok berikutnya tidak muat di halaman saat ini
 *  - Tinggi spacer = (sisa ruang halaman ini) + gap antar halaman + margin atas halaman baru
 *  - Kelas `no-print` memastikan spacer tidak ikut tercetak ke PDF
 *  - Kelas `page-spacer-visual` menampilkan indikator visual "batas halaman" di editor
 */
export const AutoPageSpacer = Node.create({
    name: 'autoPageSpacer',
    group: 'block',
    atom: true,
    selectable: false,
    draggable: false,
    isolating: false,

    addAttributes() {
        return {
            height: {
                default: 100,
                parseHTML: (el) => parseInt(el.getAttribute('data-spacer-h') || '100', 10),
                renderHTML: (attrs) => ({ 'data-spacer-h': String(attrs.height) }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-auto-page-spacer]' }];
    },

    renderHTML({ node, HTMLAttributes }) {
        return [
            'div',
            mergeAttributes(HTMLAttributes, {
                'data-auto-page-spacer': 'true',
                class: 'no-print',
                style: [
                    `height: ${node.attrs.height}px`,
                    'display: block',
                    'pointer-events: none',
                    'user-select: none',
                    'background: transparent',
                    'position: relative',
                ].join('; '),
            }),
            // Label visual "batas halaman" di tengah spacer (hanya di editor, tidak tercetak)
            [
                'div',
                {
                    style: [
                        'position: absolute',
                        'top: 50%',
                        'left: 0',
                        'right: 0',
                        'transform: translateY(-50%)',
                        'display: flex',
                        'align-items: center',
                        'justify-content: center',
                        'pointer-events: none',
                        'user-select: none',
                    ].join('; '),
                },
            ],
        ];
    },
});
