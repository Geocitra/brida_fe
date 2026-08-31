export class A4DocumentSegmenter {
  private static readonly PAGE_HEIGHT_PX = 1123;
  private static readonly PAGE_WIDTH_PX = 794;
  private static readonly MARGIN_PX = Math.round(2.5 * (96 / 2.54)); // 94px

  /**
   * Segments an HTML string into an array of HTML strings, each fitting within an A4 page.
   * This uses an offscreen sandbox to accurately measure DOM elements.
   */
  public static async segmentHTML(html: string): Promise<string[]> {
    // Wait for fonts to be ready so measurements are accurate
    await document.fonts.ready;

    return new Promise((resolve) => {
      // Create offscreen sandbox
      const sandbox = document.createElement('div');
      
      // Sandbox must be visible to calculate height, but we move it far offscreen
      Object.assign(sandbox.style, {
        position: 'absolute',
        top: '-9999px',
        left: '-9999px',
        width: `${this.PAGE_WIDTH_PX}px`,
        padding: `${this.MARGIN_PX}px`,
        boxSizing: 'border-box',
        visibility: 'hidden',
        fontFamily: "'Calibri', sans-serif",
        fontSize: '11pt',
        lineHeight: '1.18',
        color: '#1e293b'
      });

      // Provide the essential styles to mimic the render area
      sandbox.innerHTML = `
        <style>
          p { line-height: 1.18 !important; margin-top: 0 !important; margin-bottom: 14px !important; }
          p[style*="text-align: center"], p[style*="text-align:center"],
          div[style*="text-align: center"], div[style*="text-align:center"] {
            margin-bottom: 6px !important; line-height: 1.3 !important; letter-spacing: 0.02em;
          }
          td p, th p, li p { margin-bottom: 0 !important; }
          h1 { font-size: 1.4em; font-weight: 700; margin: 20px 0 10px !important; }
          h2 { font-size: 1.2em; font-weight: 700; margin: 18px 0 8px !important; }
          h3 { font-size: 1.05em; font-weight: 600; margin: 14px 0 6px !important; }
          hr { border-top: 2.5px solid #0f172a !important; border-bottom: 0.75px solid #0f172a !important; height: 4.5px !important; border-left: none !important; border-right: none !important; margin: 12px 0 18px 0 !important; }
          table { border-collapse: collapse !important; table-layout: fixed !important; width: 100% !important; margin: 16px 0 28px !important; overflow: hidden !important; }
          td, th { min-width: 80px; border: 1px solid #cbd5e1; padding: 6px 10px; vertical-align: top; box-sizing: border-box; word-break: normal; overflow-wrap: break-word; }
          th { font-weight: 700; text-align: left; background: rgba(248,250,252,0.95); }
          tr { page-break-inside: avoid !important; break-inside: avoid !important; }
          img { max-width: 100% !important; height: auto !important; margin: 16px 0; border: 1px solid #cbd5e1; }
          ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 14px; }
          ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 14px; }
        </style>
        <div id="segmenter-content">${html}</div>
      `;

      document.body.appendChild(sandbox);

      // Need a small timeout to allow browser to render the DOM nodes for measurement
      setTimeout(() => {
        const contentContainer = sandbox.querySelector('#segmenter-content') as HTMLElement;
        const children = Array.from(contentContainer.children) as HTMLElement[];
        
        const usableHeight = this.PAGE_HEIGHT_PX - (this.MARGIN_PX * 2);
        
        const pages: string[] = [];
        let currentPageContent = '';
        let currentAccHeight = 0;

        children.forEach((el, idx) => {
          const style = window.getComputedStyle(el);
          const marginTop = parseFloat(style.marginTop) || 0;
          const marginBottom = parseFloat(style.marginBottom) || 0;
          const elHeight = el.offsetHeight + marginTop + marginBottom;
          
          const isHeading = ['H1', 'H2', 'H3'].includes(el.tagName);
          let nextWillOverflow = false;
          
          if (isHeading && idx < children.length - 1) {
            const nextEl = children[idx + 1];
            const nextStyle = window.getComputedStyle(nextEl);
            const nextMarginTop = parseFloat(nextStyle.marginTop) || 0;
            const nextMarginBottom = parseFloat(nextStyle.marginBottom) || 0;
            const nextElHeight = nextEl.offsetHeight + nextMarginTop + nextMarginBottom;
            
            if (currentAccHeight + elHeight + nextElHeight > usableHeight) {
              nextWillOverflow = true;
            }
          }

          if (currentAccHeight + elHeight > usableHeight || nextWillOverflow) {
            // Push current page and start a new one
            if (currentPageContent) {
              pages.push(currentPageContent);
            }
            currentPageContent = el.outerHTML;
            currentAccHeight = elHeight;
          } else {
            currentPageContent += el.outerHTML;
            currentAccHeight += elHeight;
          }
        });

        // Push the last page
        if (currentPageContent) {
          pages.push(currentPageContent);
        }

        // Cleanup sandbox
        document.body.removeChild(sandbox);
        
        // If empty, return at least one page
        resolve(pages.length > 0 ? pages : ['']);
      }, 50);
    });
  }
}
