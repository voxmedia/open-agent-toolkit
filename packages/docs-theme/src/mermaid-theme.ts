// Builds Mermaid `base` theme variables from the site's Fumadocs color tokens
// so diagrams follow the docs site's palette in light and dark mode.

const TOKENS = {
  background: '--color-fd-background',
  card: '--color-fd-card',
  foreground: '--color-fd-foreground',
  mutedForeground: '--color-fd-muted-foreground',
  muted: '--color-fd-muted',
  secondary: '--color-fd-secondary',
  border: '--color-fd-border',
  primary: '--color-fd-primary',
} as const;

type TokenName = keyof typeof TOKENS;

// Mermaid derives shades from its theme variables and only understands sRGB
// hex/rgb input, while sites may define tokens in any CSS color space. Paint
// the color into a 1x1 canvas and read the sRGB pixel back.
function toHex(
  color: string,
  ctx: CanvasRenderingContext2D,
): string | undefined {
  if (!color) return undefined;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = '#000';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  if (a === 0) return undefined;
  return `#${[r, g, b].map((n) => n!.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Mermaid theme variables for the current page, or `undefined` when the site
 * does not define the Fumadocs color tokens (Mermaid then uses its stock
 * theme).
 */
export function siteMermaidThemeVariables(
  dark: boolean,
): Record<string, string | boolean> | undefined {
  if (typeof document === 'undefined') return undefined;
  const ctx = document
    .createElement('canvas')
    .getContext('2d', { willReadFrequently: true });
  if (!ctx) return undefined;
  const style = getComputedStyle(document.documentElement);
  const c = {} as Record<TokenName, string>;
  for (const [name, prop] of Object.entries(TOKENS) as [TokenName, string][]) {
    const hex = toHex(style.getPropertyValue(prop).trim(), ctx);
    if (!hex) return undefined;
    c[name] = hex;
  }

  return {
    darkMode: dark,
    fontFamily: getComputedStyle(document.body).fontFamily,
    background: c.card,
    textColor: c.foreground,
    titleColor: c.foreground,
    lineColor: c.mutedForeground,
    primaryColor: c.secondary,
    primaryTextColor: c.foreground,
    primaryBorderColor: c.primary,
    secondaryColor: c.muted,
    secondaryTextColor: c.foreground,
    secondaryBorderColor: c.border,
    tertiaryColor: c.card,
    tertiaryTextColor: c.foreground,
    tertiaryBorderColor: c.border,
    mainBkg: c.secondary,
    nodeBorder: c.primary,
    nodeTextColor: c.foreground,
    clusterBkg: c.muted,
    clusterBorder: c.border,
    edgeLabelBackground: c.card,
    noteBkgColor: c.muted,
    noteTextColor: c.foreground,
    noteBorderColor: c.border,
    actorBkg: c.secondary,
    actorBorder: c.primary,
    actorTextColor: c.foreground,
    actorLineColor: c.mutedForeground,
    signalColor: c.foreground,
    signalTextColor: c.foreground,
    labelBoxBkgColor: c.secondary,
    labelBoxBorderColor: c.border,
    labelTextColor: c.foreground,
    loopTextColor: c.foreground,
    activationBkgColor: c.muted,
    activationBorderColor: c.primary,
    sequenceNumberColor: c.card,
  };
}
