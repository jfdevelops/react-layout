import {
  createInspectionStore,
  inspectionId,
  serializeInspectionError,
  type InspectionStore,
  type LoadStatus,
} from '@jfdevelops/react-layout-devtools-core';
import type { LazyResourceLoadHooks } from './create-lazy-loader';
import type { LazyResourceError } from '../errors/lazy-resource-error';

/** Register a declaration before its import runs, retaining one node on retry. */
export function inspectLazy(
  label: string,
  store: InspectionStore = createInspectionStore(),
  parent?: string,
) {
  const id = inspectionId('lazy');
  function update(status: LoadStatus, error?: LazyResourceError) {
    store.node({
      id,
      kind: 'lazy',
      label,
      status,
      unresolved: status !== 'resolved',
      error: error && serializeInspectionError(error),
    });
  }
  update('unresolved');
  if (parent) store.edge(parent, id, 'declares');
  const hooks: LazyResourceLoadHooks = {
    onLoadStart: () => update('loading'),
    onLoadSuccess: () => update('resolved'),
    onLoadError: (error) => update('error', error),
    onMount: () => store.mount(id),
  };
  return {
    id,
    store,
    hooks,
    setLabel(value: string) {
      label = value;
      update('unresolved');
    },
  };
}

export function withLazyHandle<T extends object>(
  target: T,
  handle: import('./types').LazyHandle,
): T & import('./types').LazyHandle {
  Object.defineProperties(target, {
    preload: { value: handle.preload, enumerable: false },
    status: { get: () => handle.status, enumerable: false },
  });
  return target as T & import('./types').LazyHandle;
}
