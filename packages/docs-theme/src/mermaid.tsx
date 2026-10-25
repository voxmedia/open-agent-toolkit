'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { sitePeleTheme } from './pele-theme.js';
import { ZoomFrame } from './zoom-frame.js';
import { fillWidth } from './zoom-svg.js';

export interface MermaidProps {
  chart: string;
}

interface Rendered {
  inline: string;
  zoomed: string;
}

export function Mermaid({ chart }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<Rendered>({ inline: '', zoomed: '' });
  // Unique per instance so the inline and full-screen copies of every diagram
  // on a page get distinct element IDs (title, desc, markers).
  const idPrefix = `pele-${useId().replace(/[^\w-]/g, '')}`;

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const { renderAsync } = await import('pele/lazy');
      const fontFamily = containerRef.current
        ? getComputedStyle(containerRef.current).fontFamily
        : undefined;
      const inline = await renderAsync(chart, { idPrefix, fontFamily });
      const zoomed = await renderAsync(chart, {
        idPrefix: `${idPrefix}-zoom`,
        fontFamily,
      });

      if (!cancelled) {
        setSvg({ inline: inline.svg, zoomed: fillWidth(zoomed.svg) });
      }
    }

    void render();

    return () => {
      cancelled = true;
    };
  }, [chart, idPrefix]);

  return (
    <ZoomFrame
      label='Diagram'
      disabled={!svg.inline}
      zoomed={
        <div
          className='mermaid'
          style={sitePeleTheme}
          // oxlint-disable-next-line react/no-danger -- same trusted source as above
          dangerouslySetInnerHTML={{ __html: svg.zoomed }}
        />
      }
    >
      <div
        ref={containerRef}
        className='mermaid'
        style={sitePeleTheme}
        // oxlint-disable-next-line react/no-danger -- Pele escapes diagram text and filters links and styles
        dangerouslySetInnerHTML={{ __html: svg.inline }}
      />
    </ZoomFrame>
  );
}
