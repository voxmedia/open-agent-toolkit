'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { sitePeleTheme } from './pele-theme.js';
import { measureIn, renderChart, type RenderedChart } from './render-chart.js';
import { ZoomFrame } from './zoom-frame.js';

export interface MermaidProps {
  chart: string;
}

export function Mermaid({ chart }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<RenderedChart>({ inline: '', zoomed: '' });
  // Unique per instance so the inline and full-screen copies of every diagram
  // on a page get distinct element IDs (title, desc, markers).
  const idPrefix = `pele-${useId().replace(/[^\w-]/g, '')}`;

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const host = containerRef.current;
      if (!host) return;
      const rendered = await renderChart(chart, {
        idPrefix,
        fontFamily: getComputedStyle(host).fontFamily,
        measure: measureIn(host),
      });

      if (!cancelled) {
        setSvg(rendered);
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
        // oxlint-disable-next-line react/no-danger -- Pele escapes diagram text and filters links and styles; KaTeX escapes math with trust off
        dangerouslySetInnerHTML={{ __html: svg.inline }}
      />
    </ZoomFrame>
  );
}
