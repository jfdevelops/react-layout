import { createContext, useContext } from 'react';

/**
 * Callback a per-resource layout component calls to report which resource it is
 * currently rendering. An ancestor `Shell` (from
 * {@link defineResourceLayout.withLayout}) installs one of these so it can
 * resolve `resources.current` for its own render without the consumer threading
 * a route param down to it.
 *
 * @param resource - The mounted resource, or `undefined` on unmount.
 * @param ownerId - Identity of the `defineResourceLayout` definition that
 *   created the reporting component. The shell only accepts reports from its
 *   own definition — a page or pane produced by a *different* definition shares
 *   this context but its resource is unrelated, so the shell ignores it.
 */
export type ResourceLayoutShellPublisher = (
  resource: string | undefined,
  ownerId?: symbol,
) => void;

/**
 * Bridge between a `Shell` and the per-resource components rendered inside its
 * `Outlet`. It is deliberately `null` by default: a per-resource component is
 * still valid without a `Shell` ancestor (the pre-`withLayout` usage), so the
 * publish must degrade to a no-op rather than assume a provider.
 */
export const ResourceLayoutShellPublisherContext =
  createContext<ResourceLayoutShellPublisher | null>(null);

/**
 * Reads the {@link ResourceLayoutShellPublisher} installed by an ancestor
 * `Shell`, or `null` when the component renders standalone.
 */
export function useResourceLayoutShellPublisher(): ResourceLayoutShellPublisher | null {
  return useContext(ResourceLayoutShellPublisherContext);
}
