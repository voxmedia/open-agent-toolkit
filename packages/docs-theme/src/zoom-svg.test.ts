import { render } from 'pele';
import { describe, expect, it } from 'vitest';

import { fillWidth } from './zoom-svg.js';

describe('fillWidth', () => {
  it('fills the frame and keeps the theme variables on the root svg', () => {
    const { svg } = render('flowchart LR\n  A --> B', { idPrefix: 'z' });
    const style = /^<svg\b[^>]*?\sstyle="([^"]*)"/.exec(fillWidth(svg))?.[1];

    expect(style).toContain('--_bg:var(--pele-bg');
    expect(style).toContain('--_s:var(--pele-surface');
    expect(style).toMatch(/;width:100%;height:auto;max-width:none$/);
  });
});
