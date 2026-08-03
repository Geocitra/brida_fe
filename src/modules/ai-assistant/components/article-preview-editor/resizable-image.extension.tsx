import React, { useRef, useState } from 'react';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import Image from '@tiptap/extension-image';

export const ResizableImageComponent: React.FC<any> = ({ node, updateAttributes, selected }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  const onMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsResizing(true);

    const startX = event.clientX;
    const startWidth = imageRef.current?.getBoundingClientRect().width || 100;
    
    // Parent width of the editor canvas to calculate the percentage width correctly
    const parentWidth = imageRef.current?.parentElement?.getBoundingClientRect().width || 1;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      let newWidth = startWidth + deltaX;
      
      // Limit to min 40px and max 100% of parent width
      newWidth = Math.max(40, Math.min(newWidth, parentWidth));
      
      // Calculate percentage width and save it in attributes
      const widthPct = `${Math.round((newWidth / parentWidth) * 100)}%`;
      updateAttributes({ width: widthPct });
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <NodeViewWrapper 
      className={`relative inline-block my-4 mx-auto group ${selected ? 'ring-2 ring-teal-500' : ''}`} 
      style={{ 
        width: node.attrs.width || '100%', 
        display: 'block', 
        textAlign: 'center' 
      }}
    >
      <img
        ref={imageRef}
        src={node.attrs.src}
        alt={node.attrs.alt}
        title={node.attrs.title}
        style={{
          width: '100%', // Scales matching the wrapper width
          height: 'auto',
          display: 'block',
        }}
      />
      {/* Resizing Handle on Bottom Right (Rounded-none as per layout rules) */}
      <div
        onMouseDown={onMouseDown}
        className="absolute bottom-1 right-1 w-4 h-4 bg-teal-700 cursor-se-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white shadow-md rounded-none select-none no-print"
        style={{ zIndex: 10 }}
        title="Geser untuk mengubah ukuran gambar"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="white">
          <path d="M6 0h2v8H0V6h6V0z"/>
        </svg>
      </div>
    </NodeViewWrapper>
  );
};

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return { 
            width: attributes.width, 
            style: `width: ${attributes.width}; max-width: 100%;` 
          };
        },
        parseHTML: element => element.getAttribute('width') || element.style.width || '100%',
      },
      height: {
        default: 'auto',
        renderHTML: attributes => {
          if (!attributes.height) return {};
          return { 
            height: attributes.height, 
            style: `height: ${attributes.height}` 
          };
        },
        parseHTML: element => element.getAttribute('height') || element.style.height || 'auto',
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
});
