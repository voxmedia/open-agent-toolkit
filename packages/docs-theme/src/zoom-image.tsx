'use client';

import { ImageZoom } from 'fumadocs-ui/components/image-zoom';
import type { ComponentProps } from 'react';

import {
  type ImageThemeVariant,
  themeVariantOf,
  withBasePath,
} from './image-src.js';

type ImageZoomProps = ComponentProps<typeof ImageZoom>;

// MDX passes standard <img> props; ImageZoom's next/image-flavoured `src`
// type rejects `Blob`, which Markdown never produces.
type ZoomImageProps = ComponentProps<'img'>;

// Set by `@open-agent-toolkit/docs-config` when the site has a basePath.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

function srcToString(src: unknown): string | undefined {
  if (typeof src === 'string') return src;
  if (src && typeof src === 'object') {
    if ('default' in src)
      return (src as { default: { src: string } }).default.src;
    if ('src' in src) return (src as { src: string }).src;
  }
  return undefined;
}

const VARIANT_CLASS: Record<ImageThemeVariant, string> = {
  light: 'block dark:hidden',
  dark: 'hidden dark:block',
};

/**
 * Markdown image renderer: every image opens in a zoom view on click, and a
 * `-light` / `-dark` file pair shows only the file that matches the site
 * theme. Map it as `img` in the MDX components.
 */
export function ZoomImage(props: ZoomImageProps) {
  const variant = themeVariantOf(srcToString(props.src));
  const src =
    typeof props.src === 'string'
      ? withBasePath(props.src, BASE_PATH)
      : props.src;
  const zoom = <ImageZoom {...({ ...props, src } as ImageZoomProps)} />;
  if (!variant) return zoom;
  return (
    <span className={VARIANT_CLASS[variant]} data-theme-variant={variant}>
      {zoom}
    </span>
  );
}
