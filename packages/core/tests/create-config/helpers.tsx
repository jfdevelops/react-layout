import { render } from '@testing-library/react';
import { Component, type ReactNode } from 'react';
import { vi } from 'vitest';
import { defineResourceLayout } from '../../src';

/** Factory bound to `users` + `posts`. Pass `resources` for extras. */
export const testResourceLayout = defineResourceLayout.forResources(
  'users',
  'posts',
);

/** Minimal defined layout for tests that only need create* APIs. */
export const testResourceLayoutWithRender = testResourceLayout({
  layout: {
    render: () => <section />,
  },
});

class RenderErrorBoundary extends Component<
  { children?: ReactNode; onError: (error: Error) => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Renders `element` and returns the error it threw during render.
 *
 * Letting the error propagate out of `render` leaves it uncaught, which jsdom
 * reports to its virtual console — full stacks in otherwise passing output.
 * Three things are needed to keep it quiet: the boundary contains the error,
 * the spy silences React's own `console.error`, and the listener cancels the
 * synthetic window error event React dispatches in development so browsers
 * still report caught render errors.
 */
export function renderCapturingError(element: ReactNode) {
  let captured: Error | undefined;
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  const suppressWindowError = (event: ErrorEvent) => event.preventDefault();

  window.addEventListener('error', suppressWindowError);

  try {
    render(
      <RenderErrorBoundary
        onError={(error) => {
          captured = error;
        }}
      >
        {element}
      </RenderErrorBoundary>,
    );
  } finally {
    window.removeEventListener('error', suppressWindowError);
    consoleError.mockRestore();
  }

  return captured;
}
