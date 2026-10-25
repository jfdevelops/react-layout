import {
  createElement,
  forwardRef,
  useLayoutEffect,
  type ComponentType,
} from 'react';
import {
  createInspectionStore,
  inspectionId,
  type InspectionStore,
} from '@jfdevelops/react-layout-devtools-core';
import type { ResourceDefinition } from '../resource';
export function inspectDefinition(resources: readonly ResourceDefinition[]) {
  const store = createInspectionStore();
  const definition = store.node({
    id: inspectionId('definition'),
    kind: 'definition',
    label: 'Layout definition',
  });
  const resourceIds = new Map<string, string>();
  function visit(
    items: readonly ResourceDefinition[],
    parent: string,
    prefix = ''
  ) {
    for (const item of items) {
      const slug = typeof item === 'string' ? item : item.value;
      const path = prefix ? `${prefix}.${slug}` : slug;
      const id = store.node({
        id: inspectionId('resource'),
        kind: 'resource',
        label: path,
        details: { path },
      });
      resourceIds.set(path, id);
      store.edge(parent, id, 'contains');
      if (typeof item !== 'string') visit(item.subResources, id, path);
    }
  }
  visit(resources, definition);
  return { store, definition, resourceIds };
}
export interface ActiveInspection {
  store: InspectionStore;
  layout: string;
  resource?: string;
  state: string;
}

/** Preserve composable metadata while measuring committed React instances, not declarations. */
export function trackComposable<T extends object>(
  component: T,
  store: InspectionStore,
  id: string
): T {
  const Tracked = forwardRef<unknown, Record<string, unknown>>(
    function InspectedComposable(props, ref) {
      useLayoutEffect(() => store.mount(id), [store, id]);
      return createElement(
        component as ComponentType<Record<string, unknown>>,
        ref == null ? props : { ...props, ref }
      );
    }
  );
  for (const key of Reflect.ownKeys(component)) {
    if (
      typeof key === 'string' &&
      [
        'name',
        'length',
        'prototype',
        'caller',
        'arguments',
        '$$typeof',
        'render',
        'compare',
        'type',
      ].includes(key)
    )
      continue;
    const descriptor = Object.getOwnPropertyDescriptor(component, key);
    if (descriptor) Object.defineProperty(Tracked, key, descriptor);
  }
  return Tracked as unknown as T;
}
