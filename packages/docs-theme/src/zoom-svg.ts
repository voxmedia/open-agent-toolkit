/**
 * Sizes a rendered diagram to fill the full-screen view. Pele sizes its root
 * `<svg>` to the diagram's natural width, capped at the container, and keeps
 * its theme variables in the same style attribute, so append the sizing
 * rather than replace the attribute; the later declarations win.
 */
export function fillWidth(svg: string): string {
  return svg.replace(
    /^(<svg\b[^>]*?\sstyle=")([^"]*)"/,
    '$1$2;width:100%;height:auto;max-width:none"',
  );
}
