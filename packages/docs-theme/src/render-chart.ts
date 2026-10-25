import type { MathResolver } from 'pele';

import { fillWidth } from './zoom-svg.js';

/** Size of rendered math markup at a font size, in CSS pixels. */
export type MeasureMath = (
  html: string,
  size: number,
) => { width: number; height: number } | null;

export interface RenderChartOptions {
  idPrefix: string;
  fontFamily?: string;
  measure: MeasureMath;
}

export interface RenderedChart {
  inline: string;
  zoomed: string;
}

// Pele places `$$...$$` equations from labels and messages through this
// resolver and needs their size up front. KaTeX's MathML output renders
// natively in browsers, so no KaTeX stylesheet is required.
async function loadMath(measure: MeasureMath): Promise<MathResolver> {
  const { default: katex } = await import('katex');
  return (tex, size) => {
    const html = katex.renderToString(tex, {
      output: 'mathml',
      // Mermaid renders `$$...$$` as display math, which `\tag` needs.
      displayMode: true,
      throwOnError: false,
      // Pele inserts this markup unsanitized; keep KaTeX's escaping strict.
      trust: false,
    });
    const box = measure(html, size);
    return box ? { html, ...box } : null;
  };
}

/**
 * Renders a chart's inline SVG and its full-screen copy with distinct element
 * IDs. KaTeX loads only for charts that contain `$$`.
 */
export async function renderChart(
  chart: string,
  { idPrefix, fontFamily, measure }: RenderChartOptions,
): Promise<RenderedChart> {
  const [{ renderAsync }, math] = await Promise.all([
    import('pele/lazy'),
    chart.includes('$$') ? loadMath(measure) : undefined,
  ]);
  const inline = await renderAsync(chart, { idPrefix, fontFamily, math });
  const zoomed = await renderAsync(chart, {
    idPrefix: `${idPrefix}-zoom`,
    fontFamily,
    math,
  });
  return { inline: inline.svg, zoomed: fillWidth(zoomed.svg) };
}

/** Measures math markup in a hidden probe inside `host`, inheriting its fonts. */
export function measureIn(host: HTMLElement): MeasureMath {
  return (html, size) => {
    const probe = host.ownerDocument.createElement('span');
    probe.style.cssText = `position:absolute;visibility:hidden;left:0;top:0;white-space:nowrap;line-height:normal;font-size:${size}px`;
    probe.innerHTML = html;
    host.append(probe);
    const { width, height } = probe.getBoundingClientRect();
    probe.remove();
    return width > 0 && height > 0
      ? { width: Math.ceil(width), height: Math.ceil(height) }
      : null;
  };
}
