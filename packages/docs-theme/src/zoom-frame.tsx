'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ZoomFrameProps {
  /** Accessible name for the enlarge control, e.g. the diagram's alt text. */
  label: string;
  /** The inline, column-width rendering. */
  children: ReactNode;
  /** What to show in the full-screen view. */
  zoomed: ReactNode;
  disabled?: boolean;
}

// The full-screen view renders the diagram at least this wide, so labels stay
// legible on a phone; the reader pans to see the rest. Wider screens fit the
// diagram to the window, up to the maximum.
const ZOOMED_MIN_WIDTH = 900;
const ZOOMED_MAX_WIDTH = 1400;

/**
 * Click-to-enlarge wrapper for diagrams. The inline view fits the column; the
 * full-screen view is a native modal dialog that scrolls in both directions
 * and closes on Escape, the close button, or a click.
 */
export function ZoomFrame({
  label,
  children,
  zoomed,
  disabled,
}: ZoomFrameProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // The dialog lives in a portal on <body>: rendered in place it would sit
  // inside a Markdown <p>, which the HTML parser splits, breaking hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const open = () => {
    const dialog = dialogRef.current;
    if (!dialog || disabled) return;
    dialog.showModal();
    dialog.scrollLeft = (dialog.scrollWidth - dialog.clientWidth) / 2;
    dialog.scrollTop = 0;
  };
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type='button'
        onClick={open}
        disabled={disabled}
        aria-label={`Enlarge: ${label}`}
        title='Enlarge'
        style={{
          position: 'relative',
          display: 'block',
          width: '100%',
          padding: 0,
          border: 0,
          background: 'none',
          color: 'inherit',
          font: 'inherit',
          textAlign: 'inherit',
          cursor: disabled ? 'default' : 'zoom-in',
        }}
      >
        {children}
        {!disabled && (
          <span
            aria-hidden='true'
            style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              border: '1px solid var(--color-fd-border, #ccc)',
              background: 'var(--color-fd-card, #fff)',
              color: 'var(--color-fd-muted-foreground, #555)',
              fontSize: '0.75rem',
              lineHeight: 1.4,
            }}
          >
            ⤢ Enlarge
          </span>
        )}
      </button>
      {mounted &&
        createPortal(
          <dialog
            ref={dialogRef}
            aria-label={label}
            onClick={close}
            style={{
              width: '100vw',
              maxWidth: '100vw',
              height: '100dvh',
              maxHeight: '100dvh',
              margin: 0,
              padding: '3rem 1rem 1rem',
              border: 0,
              background: 'var(--color-fd-background, #fff)',
              color: 'inherit',
              overflow: 'auto',
              cursor: 'zoom-out',
            }}
          >
            <button
              type='button'
              onClick={close}
              aria-label='Close enlarged view'
              style={{
                position: 'fixed',
                top: '0.75rem',
                right: '0.75rem',
                width: '2.25rem',
                height: '2.25rem',
                borderRadius: '9999px',
                border: '1px solid var(--color-fd-border, #ccc)',
                background: 'var(--color-fd-card, #fff)',
                color: 'inherit',
                fontSize: '1.25rem',
                lineHeight: 1,
                cursor: 'pointer',
              }}
            >
              ×
            </button>
            <div
              style={{
                width: `max(100%, ${ZOOMED_MIN_WIDTH}px)`,
                maxWidth: `${ZOOMED_MAX_WIDTH}px`,
                margin: '0 auto',
              }}
            >
              {zoomed}
            </div>
          </dialog>,
          document.body,
        )}
    </>
  );
}
