'use client';

import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';

import { siteMermaidThemeVariables } from './mermaid-theme.js';
import { ZoomFrame } from './zoom-frame.js';

export interface MermaidProps {
  chart: string;
}

export function Mermaid({ chart }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const mermaid = (await import('mermaid')).default;

      const dark = resolvedTheme === 'dark';
      const themeVariables = siteMermaidThemeVariables(dark);
      mermaid.initialize({
        startOnLoad: false,
        ...(themeVariables
          ? { theme: 'base', themeVariables }
          : { theme: dark ? 'dark' : 'default' }),
      });

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

  return (
    <ZoomFrame
      label='Diagram'
      disabled={!svg}
      zoomed={
        <div
          className='mermaid'
          // oxlint-disable-next-line react/no-danger -- same trusted SVG as above
          dangerouslySetInnerHTML={{
            __html: svg.replace(
              /<svg\b([^>]*?)\sstyle="[^"]*"/,
              '<svg$1 style="width:100%;height:auto;max-width:none"',
            ),
          }}
        />
      }
    >
      <div
        ref={containerRef}
        className='mermaid'
        // oxlint-disable-next-line react/no-danger -- mermaid renders SVG from trusted chart definitions
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </ZoomFrame>
  );
}
