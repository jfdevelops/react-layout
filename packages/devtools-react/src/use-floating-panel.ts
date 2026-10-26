import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from 'react';

export interface PanelPreferences {
  x: number;
  y: number;
  width: number;
  height: number;
  mode: 'floating' | 'docked' | 'expanded';
}

type Rect = Omit<PanelPreferences, 'mode'>;

type Viewport = { width: number; height: number };

type Gesture = {
  pointer: number;
  x: number;
  y: number;
  rect: Rect;
  kind: 'move' | 'resize';
};

function clamp(rect: Rect, viewport: Viewport): Rect {
  const gap = Math.min(16, viewport.width / 4, viewport.height / 4);
  const maxWidth = Math.max(1, viewport.width - gap * 2);
  const maxHeight = Math.max(1, viewport.height - gap * 2);
  const width = Math.max(
    Math.min(340, maxWidth),
    Math.min(maxWidth, rect.width)
  );
  const height = Math.max(
    Math.min(260, maxHeight),
    Math.min(maxHeight, rect.height)
  );

  return {
    width,
    height,
    x: Math.max(gap, Math.min(viewport.width - width - gap, rect.x)),
    y: Math.max(gap, Math.min(viewport.height - height - gap, rect.y)),
  };
}

export function useFloatingPanel(
  saved: PanelPreferences | undefined,
  save: (value: PanelPreferences) => void,
  position: string
) {
  const [viewport, setViewport] = useState<Viewport>(() => ({
    width: typeof window === 'undefined' ? 1024 : window.innerWidth,
    height: typeof window === 'undefined' ? 768 : window.innerHeight,
  }));
  const [draft, setDraft] = useState<Rect>();
  const gesture = useRef<Gesture>();
  const draftRef = useRef<Rect>();
  const mode = saved?.mode ?? 'floating';
  const width = Math.min(560, viewport.width - 32);
  const height = Math.min(480, Math.round(viewport.height * 0.6));
  const floating = clamp(
    draft ??
      saved ?? {
        width,
        height,
        x: position.endsWith('right') ? viewport.width - width - 16 : 16,
        y: position.startsWith('bottom') ? viewport.height - height - 16 : 16,
      },
    viewport
  );
  const rect =
    mode === 'expanded'
      ? clamp(
          {
            x: 16,
            y: 16,
            width: viewport.width - 32,
            height: viewport.height - 32,
          },
          viewport
        )
      : mode === 'docked'
      ? {
          ...floating,
          x: 16,
          y: viewport.height - floating.height - 16,
          width: Math.max(1, viewport.width - 32),
        }
      : floating;

  useEffect(() => {
    const resize = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });

    window.addEventListener('resize', resize);

    return () => window.removeEventListener('resize', resize);
  }, []);

  function setMode(next: PanelPreferences['mode']) {
    save({ ...floating, mode: next });
  }

  function updateDraft(value: Rect) {
    const next = clamp(value, viewport);

    draftRef.current = next;

    setDraft(next);
  }

  function bindings(kind: Gesture['kind']) {
    return {
      onPointerDown(event: PointerEvent<HTMLButtonElement>) {
        if (
          event.button !== 0 ||
          event.isPrimary === false ||
          mode === 'expanded' ||
          (kind === 'move' && mode !== 'floating')
        )
          return;

        event.preventDefault();

        gesture.current = {
          pointer: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          rect: floating,
          kind,
        };

        event.currentTarget.setPointerCapture?.(event.pointerId);
      },

      onPointerMove(event: PointerEvent<HTMLButtonElement>) {
        const active = gesture.current;

        if (!active || active.pointer !== event.pointerId) return;

        const dx = event.clientX - active.x;
        const dy = event.clientY - active.y;

        updateDraft(
          active.kind === 'move'
            ? { ...active.rect, x: active.rect.x + dx, y: active.rect.y + dy }
            : {
                ...active.rect,
                x: active.rect.x + (mode === 'docked' ? 0 : dx),
                y: active.rect.y + dy,
                width: active.rect.width - (mode === 'docked' ? 0 : dx),
                height: active.rect.height - dy,
              }
        );
      },

      onPointerUp(event: PointerEvent<HTMLButtonElement>) {
        if (!gesture.current || gesture.current.pointer !== event.pointerId)
          return;

        save({ ...(draftRef.current ?? floating), mode });

        gesture.current = undefined;

        draftRef.current = undefined;

        setDraft(undefined);

        if (event.currentTarget.hasPointerCapture?.(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      },

      onPointerCancel() {
        gesture.current = undefined;

        draftRef.current = undefined;

        setDraft(undefined);
      },

      onLostPointerCapture() {
        if (!gesture.current) return;

        gesture.current = undefined;

        draftRef.current = undefined;

        setDraft(undefined);
      },

      onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        if (
          !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(
            event.key
          ) ||
          mode === 'expanded' ||
          (kind === 'move' && mode !== 'floating')
        )
          return;

        event.preventDefault();

        event.stopPropagation();

        const step = event.shiftKey ? 40 : 10;
        const dx =
          event.key === 'ArrowLeft'
            ? -step
            : event.key === 'ArrowRight'
            ? step
            : 0;
        const dy =
          event.key === 'ArrowUp'
            ? -step
            : event.key === 'ArrowDown'
            ? step
            : 0;
        const next =
          kind === 'move'
            ? { ...floating, x: floating.x + dx, y: floating.y + dy }
            : {
                ...floating,
                x: floating.x + (mode === 'docked' ? 0 : dx),
                y: floating.y + dy,
                width: floating.width - (mode === 'docked' ? 0 : dx),
                height: floating.height - dy,
              };

        save({ ...clamp(next, viewport), mode });
      },
    };
  }

  return {
    rect,
    mode,
    setMode,
    move: bindings('move'),
    resize: bindings('resize'),
  };
}
