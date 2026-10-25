import {
  useEffect,
  useRef,
  useState,
  type RefObject,
  type PointerEvent,
  type KeyboardEvent,
} from 'react';
type Point = { x: number; y: number };
type Gesture = {
  pointerId: number;
  origin: Point;
  start: Point;
  moved: boolean;
};
const size = 52;
function clamp(point: Point): Point {
  const maxX = Math.max(0, window.innerWidth - size);
  const maxY = Math.max(0, window.innerHeight - size);
  const gapX = Math.min(8, maxX / 2),
    gapY = Math.min(8, maxY / 2);
  return {
    x: Math.max(gapX, Math.min(maxX - gapX, point.x)),
    y: Math.max(gapY, Math.min(maxY - gapY, point.y)),
  };
}
/** Pointer capture keeps a drag intact outside the button; a threshold preserves clicks. */
export function useDraggableFab(
  button: RefObject<HTMLButtonElement>,
  savedPosition?: Point,
  onPositionChange?: (point: Point | undefined) => void
) {
  const [localPosition, setLocalPosition] = useState<Point>();
  const stored = onPositionChange ? savedPosition : localPosition;
  const coordinates =
    stored && typeof window !== 'undefined' ? clamp(stored) : stored;
  function setCoordinates(
    change:
      | Point
      | undefined
      | ((previous: Point | undefined) => Point | undefined)
  ) {
    if (onPositionChange)
      onPositionChange(
        typeof change === 'function' ? change(coordinates) : change
      );
    else setLocalPosition(change);
  }
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<Gesture>();
  const suppressClick = useRef(false);
  useEffect(() => {
    const resize = () => setCoordinates((point) => point && clamp(point));
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [stored?.x, stored?.y, onPositionChange]);
  function end(event: PointerEvent<HTMLButtonElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    suppressClick.current = current.moved;
    gesture.current = undefined;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return {
    coordinates,
    dragging,
    consumeClick(detail: number) {
      const suppressed = suppressClick.current && detail !== 0;
      suppressClick.current = false;
      return suppressed;
    },
    handlers: {
      onPointerDown(event: PointerEvent<HTMLButtonElement>) {
        if (gesture.current || event.button !== 0 || event.isPrimary === false)
          return;
        const rect = event.currentTarget.getBoundingClientRect();
        suppressClick.current = false;
        gesture.current = {
          pointerId: event.pointerId,
          origin: { x: rect.left, y: rect.top },
          start: { x: event.clientX, y: event.clientY },
          moved: false,
        };
        event.currentTarget.setPointerCapture?.(event.pointerId);
      },
      onPointerMove(event: PointerEvent<HTMLButtonElement>) {
        const current = gesture.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const dx = event.clientX - current.start.x,
          dy = event.clientY - current.start.y;
        if (!current.moved && dx * dx + dy * dy < 25) return;
        current.moved = true;
        event.preventDefault();
        setDragging(true);
        setCoordinates(
          clamp({ x: current.origin.x + dx, y: current.origin.y + dy })
        );
      },
      onPointerUp: end,
      onPointerCancel: end,
      onLostPointerCapture: end,
      onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        if (
          !event.altKey ||
          !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(
            event.key
          )
        )
          return;
        event.preventDefault();
        const rect = button.current?.getBoundingClientRect();
        if (!rect) return;
        const step = event.shiftKey ? 50 : 10;
        setCoordinates((point) =>
          clamp({
            x:
              (point?.x ?? rect.left) +
              (event.key === 'ArrowLeft'
                ? -step
                : event.key === 'ArrowRight'
                ? step
                : 0),
            y:
              (point?.y ?? rect.top) +
              (event.key === 'ArrowUp'
                ? -step
                : event.key === 'ArrowDown'
                ? step
                : 0),
          })
        );
      },
    },
  };
}
