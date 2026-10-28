import { useLayoutEffect, useState, type RefObject } from 'react';

interface Viewport {
  left: number;
  top: number;
  width: number;
  height: number;
}

// jsdom and hidden panes report zero sizes; assume a typical panel instead.
const FALLBACK = { width: 1024, height: 600 };

/** Tracks the scroll position and size of a scroll container. */
export function useExplorerViewport(ref: RefObject<HTMLElement | null>) {
  const [viewport, setViewport] = useState<Viewport>({
    left: 0,
    top: 0,
    ...FALLBACK,
  });

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) return;

    const read = () =>
      setViewport((current) => {
        const next = {
          left: element.scrollLeft,
          top: element.scrollTop,
          width: element.clientWidth || FALLBACK.width,
          height: element.clientHeight || FALLBACK.height,
        };

        return next.left === current.left &&
          next.top === current.top &&
          next.width === current.width &&
          next.height === current.height
          ? current
          : next;
      });

    read();

    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(read);

    observer?.observe(element);

    element.addEventListener('scroll', read, { passive: true });

    window.addEventListener('resize', read);

    return () => {
      observer?.disconnect();

      element.removeEventListener('scroll', read);

      window.removeEventListener('resize', read);
    };
  }, [ref]);

  return viewport;
}
