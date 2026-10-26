import {
  cloneElement,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

/** Shared, dependency-free tooltip for both view controls and inspection chips. */
export function HelpTooltip({
  children,
  content,
}: {
  children: ReactElement<HTMLAttributes<HTMLElement>>;
  content: ReactNode;
}) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const hovered = useRef(false);
  const focused = useRef(false);
  const dismissed = useRef(false);

  function dismiss() {
    dismissed.current = true;

    setOpen(false);
  }

  function hover(value: boolean) {
    hovered.current = value;

    if (!value) dismissed.current = false;

    if (!dismissed.current && (value || !focused.current)) setOpen(value);
  }

  function focus(value: boolean) {
    focused.current = value;

    if (!value && !hovered.current) dismissed.current = false;

    if (!dismissed.current && (value || !hovered.current)) setOpen(value);
  }

  const [position, setPosition] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!open) return;

    const rect = anchor.current!.getBoundingClientRect();
    const bounds = popup.current!.getBoundingClientRect();

    setPosition({
      left: Math.max(
        8,
        Math.min(
          rect.left + rect.width / 2 - bounds.width / 2,
          window.innerWidth - bounds.width - 8
        )
      ),
      top:
        rect.top >= bounds.height + 14
          ? rect.top - bounds.height - 6
          : Math.min(rect.bottom + 6, window.innerHeight - bounds.height - 8),
    });

    window.addEventListener('resize', dismiss);

    window.addEventListener('scroll', dismiss, true);

    return () => {
      window.removeEventListener('resize', dismiss);

      window.removeEventListener('scroll', dismiss, true);
    };
  }, [open, content]);

  return (
    <span
      ref={anchor}
      style={{ display: 'inline-flex', maxWidth: '100%' }}
      onPointerMove={() => hover(true)}
      onMouseEnter={() => hover(true)}
      onPointerLeave={() => hover(false)}
      onMouseLeave={() => hover(false)}
      onFocusCapture={() => focus(true)}
      onBlurCapture={(event) =>
        focus(event.currentTarget.contains(event.relatedTarget as Node | null))
      }
      onPointerDown={dismiss}
      onClickCapture={dismiss}
      onKeyDownCapture={(event) => {
        if (event.key === 'Enter' || event.key === ' ') dismiss();

        if (event.key === 'Escape' && open) {
          event.stopPropagation();

          dismiss();
        }
      }}
    >
      {cloneElement(children, {
        'aria-describedby': open
          ? [children.props['aria-describedby'], id].filter(Boolean).join(' ')
          : children.props['aria-describedby'],
      })}
      {open &&
        createPortal(
          <div
            ref={popup}
            id={id}
            role="tooltip"
            style={{
              position: 'fixed',
              ...position,
              zIndex: 2147483647,
              maxWidth: 'min(280px, calc(100vw - 16px))',
              padding: '7px 10px',
              color: '#f1f5f9',
              background: '#182335',
              border: '1px solid #475569',
              borderRadius: 6,
              font: '12px/1.5 ui-sans-serif, system-ui, sans-serif',
              boxShadow: '0 4px 12px #0004',
              overflowWrap: 'anywhere',
              pointerEvents: 'none',
            }}
          >
            {content}
          </div>,
          document.body
        )}
    </span>
  );
}
