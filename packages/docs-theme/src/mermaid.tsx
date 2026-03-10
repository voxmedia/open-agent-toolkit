'use client';

import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';

export interface MermaidProps {
  chart: string;
}

let mermaidInitialized = false;

export function Mermaid({ chart }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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

    render();

    return () => {
      cancelled = true;
    };
  }, [chart, resolvedTheme]);

  return (
    <div
      ref={containerRef}
      className='mermaid'
      // oxlint-disable-next-line react/no-danger -- mermaid renders SVG from trusted chart definitions
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
