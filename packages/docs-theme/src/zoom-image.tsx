'use client';

import { ImageZoom } from 'fumadocs-ui/components/image-zoom';
import type { ComponentProps, ReactNode } from 'react';

import {
  type ImageThemeVariant,
  isSvgSource,
  themeVariantOf,
  withBasePath,
} from './image-src.js';
import { ZoomFrame } from './zoom-frame.js';

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
 * Markdown image renderer; map it as `img` in the MDX components. SVG
 * diagrams open in a full-screen view that pans on small screens, other
 * images use Fumadocs ImageZoom, and a `-light` / `-dark` file pair shows only
 * the file that matches the site theme.
 */
export function ZoomImage(props: ZoomImageProps) {
  const raw = srcToString(props.src);
  const variant = themeVariantOf(raw);
  const src =
    typeof props.src === 'string'
      ? withBasePath(props.src, BASE_PATH)
      : props.src;
  let node: ReactNode;
  if (isSvgSource(raw)) {
    // Diagrams use the full-screen pannable view; ImageZoom only scales an
    // image to the viewport, which leaves diagram text unreadable on a phone.
    const url = srcToString(src) ?? '';
    const { src: _src, alt = '', className, ...rest } = props;
    node = (
      <ZoomFrame
        label={alt || 'Diagram'}
        zoomed={
          <img
            src={url}
            alt={alt}
            style={{ display: 'block', width: '100%' }}
          />
        }
      >
        <img
          {...rest}
          src={url}
          alt={alt}
          className={className}
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
      </ZoomFrame>
    );
  } else {
    node = <ImageZoom {...({ ...props, src } as ImageZoomProps)} />;
  }
  if (!variant) return node;
  return (
    <span className={VARIANT_CLASS[variant]} data-theme-variant={variant}>
      {node}
    </span>
  );
}
