'use client';

import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';

export interface MermaidProps {
  chart: string;
}

let mermaidInitialized = false;

export function Mermaid({ chart }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [svg, setSvg] = useState<string>('');
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const mermaid = (await import('mermaid')).default;

      if (!mermaidInitialized) {
        mermaid.initialize({
          startOnLoad: false,
          theme: resolvedTheme === 'dark' ? 'dark' : 'default',
        });
        mermaidInitialized = true;
      } else {
        mermaid.initialize({
          startOnLoad: false,
          theme: resolvedTheme === 'dark' ? 'dark' : 'default',
        });
      }

      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      const { svg: rendered } = await mermaid.render(id, chart);

      if (!cancelled) {
        setSvg(rendered);
      }
    }

    void render();

    return () => {
      cancelled = true;
    };
  }, [chart, resolvedTheme]);

  const openZoom = () => {
    if (svg) dialogRef.current?.showModal();
  };

  return (
    <>
      <button
        type='button'
        onClick={openZoom}
        aria-label='Enlarge diagram'
        title='Enlarge diagram'
        disabled={!svg}
        style={{
          display: 'block',
          width: '100%',
          padding: 0,
          border: 0,
          background: 'none',
          color: 'inherit',
          font: 'inherit',
          cursor: svg ? 'zoom-in' : 'default',
        }}
      >
        <div
          ref={containerRef}
          className='mermaid'
          // oxlint-disable-next-line react/no-danger -- mermaid renders SVG from trusted chart definitions
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </button>
      <dialog
        ref={dialogRef}
        aria-label='Enlarged diagram'
        onClick={() => dialogRef.current?.close()}
        className='mermaid-zoom'
        style={{
          width: '100vw',
          maxWidth: '100vw',
          height: '100dvh',
          maxHeight: '100dvh',
          margin: 0,
          padding: '1.5rem',
          border: 0,
          background: 'var(--color-fd-background, #fff)',
          color: 'inherit',
          overflow: 'auto',
          cursor: 'zoom-out',
        }}
      >
        <div
          className='mermaid'
          style={{ minWidth: 'min(100%, 1100px)', margin: '0 auto' }}
          // oxlint-disable-next-line react/no-danger -- same trusted SVG as above
          dangerouslySetInnerHTML={{
            __html: svg.replace(
              /<svg\b([^>]*?)\sstyle="[^"]*"/,
              '<svg$1 style="width:100%;height:auto;max-width:none"',
            ),
          }}
        />
      </dialog>
    </>
  );
}
