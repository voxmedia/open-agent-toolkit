export type ImageThemeVariant = 'light' | 'dark';

// A file named `<name>-light.<ext>` or `<name>-dark.<ext>` is shown only in
// that site theme. The optional middle segment covers the content hash the
// bundler adds to imported assets (`<name>-dark.4f3a2b1c.svg`).
const THEME_VARIANT_PATTERN =
  /-(light|dark)(?:\.[\w-]+)?\.(?:svg|png|jpe?g|gif|webp|avif)(?:[?#].*)?$/i;

/** Which site theme an image file is for, from its `-light`/`-dark` name. */
export function themeVariantOf(
  src: string | undefined,
): ImageThemeVariant | null {
  if (!src) return null;
  const match = THEME_VARIANT_PATTERN.exec(src);
  if (!match) return null;
  return match[1]!.toLowerCase() as ImageThemeVariant;
}

/** Prefix a root-relative public asset path with the site's base path. */
export function withBasePath(src: string, basePath: string): string {
  if (!basePath || !src.startsWith('/') || src.startsWith('//')) return src;
  if (src === basePath || src.startsWith(`${basePath}/`)) return src;
  return `${basePath}${src}`;
}

/** Whether an image file is an SVG (diagrams are authored as SVG). */
export function isSvgSource(src: string | undefined): boolean {
  return !!src && /\.svg(?:[?#].*)?$/i.test(src);
}
