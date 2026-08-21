import { ReactNodeViewRenderer } from '@tiptap/react';
import Image from '@tiptap/extension-image';
import { ResizableImageComponent } from './resizable-image.component';

export const ResizableImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return {
            'data-width': attributes.width,
            style: `width: ${attributes.width}; max-width: 100%; height: auto;`,
          };
        },
        parseHTML: (element) => {
          return element.getAttribute('data-width')
            || element.style.width
            || element.getAttribute('width')
            || '100%';
        },
      },
      height: {
        default: 'auto',
        renderHTML: (attributes) => {
          if (!attributes.height || attributes.height === 'auto') return {};
          return {
            height: attributes.height,
          };
        },
        parseHTML: (element) => element.getAttribute('height') || 'auto',
      },
      align: {
        default: 'center',
        renderHTML: (attributes) => {
          const align = attributes.align || 'center';
          return {
            'data-align': align,
          };
        },
        parseHTML: (element) => {
          return element.getAttribute('data-align') || 'center';
        },
      },
      caption: {
        default: '',
        renderHTML: (attributes) => {
          if (!attributes.caption) return {};
          return {
            'data-caption': attributes.caption,
          };
        },
        parseHTML: (element) => element.getAttribute('data-caption') || '',
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
});
