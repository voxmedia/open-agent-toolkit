import { describe, expect, it } from 'vitest';

import { renderChart } from './render-chart.js';

// Node has no layout engine, so measurement returns a fixed box.
const measure = () => ({ width: 24, height: 18 });

describe('renderChart', () => {
  it.each([
    ['flowchart label', 'flowchart LR\n  A["Area $$x^2$$"] --> B'],
    ['sequence message', 'sequenceDiagram\n  A->>B: Area $$x^2$$'],
  ])('renders $$...$$ in a %s as MathML in both copies', async (_, chart) => {
    const { inline, zoomed } = await renderChart(chart, {
      idPrefix: 't',
      measure,
    });

    for (const svg of [inline, zoomed]) {
      expect(svg).toMatch(
        /<math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML">/,
      );
      expect(svg).not.toContain('$$x^2$$');
    }
  });
});
