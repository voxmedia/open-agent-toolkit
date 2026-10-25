import type { CSSProperties } from 'react';

/**
 * Maps Pele's theme variables to the site's Fumadocs color tokens, so diagrams
 * follow the docs palette in light and dark mode.
 *
 * Applied as inline custom properties on the diagram wrapper, the same way the
 * other components here reference `--color-fd-*` tokens, so consumers need no
 * extra stylesheet. Pele's SVG reads `var(--pele-*)` from its ancestors, so a
 * theme switch recolors diagrams without re-rendering. A token the site does
 * not define leaves the variable invalid, and Pele falls back to its default.
 */
export const sitePeleTheme = {
  '--pele-bg': 'var(--color-fd-card)',
  '--pele-fg': 'var(--color-fd-foreground)',
  '--pele-muted': 'var(--color-fd-muted-foreground)',
  '--pele-line': 'var(--color-fd-muted-foreground)',
  '--pele-surface': 'var(--color-fd-secondary)',
  '--pele-surface-alt': 'var(--color-fd-muted)',
  '--pele-border': 'var(--color-fd-primary)',
  '--pele-accent': 'var(--color-fd-primary)',
} as CSSProperties;
