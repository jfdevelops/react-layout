import { lazy, type ComponentType } from 'react';
import { ResourceModuleLoadError } from '../errors/resource-state-error';
import {
  LazyResourceStateNotFoundError,
  isLazyResourceError,
  type LazyResourceError,
} from '../errors/lazy-resource-error';
import type { LazyHandle, LoadStatus } from './types';

export type LazyResourceLoadHooks = {
  onLoadStart?: () => void;
  onLoadSuccess?: () => void;
  onLoadError?: (error: LazyResourceError) => void;
  onMount?: () => (() => void) | undefined;
};

export type LazyLoader<Selected> = LazyHandle & {
  get(): Promise<Selected>;
  reset(): void;
  component(
    member?: PropertyKey,
    map?: (selected: Selected) => ComponentType<any>,
  ): ComponentType<any>;
};

/** A single import cache and lifecycle shared by every lazy entry point. */
export function createLazyLoader<Module, Selected>(options: {
  load: () => Promise<Module>;
  select: (module: Module) => Selected | Promise<Selected>;
  label: string;
  hooks?: LazyResourceLoadHooks;
}): LazyLoader<Selected> {
  let promise: Promise<Selected> | undefined;
  let preloadPromise: Promise<void> | undefined;
  let status: LoadStatus = 'unresolved';
  const components = new Map<unknown, ComponentType<any>>();
  let generation = 0;

  function get() {
    if (promise) return promise;
    const attempt = generation;
    status = 'loading';
    options.hooks?.onLoadStart?.();
    promise = Promise.resolve()
      .then(options.load)
      .catch((cause: unknown) => {
        if (isLazyResourceError(cause)) throw cause;
        if (process.env.NODE_ENV !== 'production') {
          console.error(
            `[react-layout] lazy "${options.label}" failed to load`,
            cause,
          );
        }
        throw new ResourceModuleLoadError(options.label, cause);
      })
      .then(options.select)
      .then(
        (selected) => {
          if (attempt === generation) {
            status = 'resolved';
            options.hooks?.onLoadSuccess?.();
          }
          return selected;
        },
        (error: LazyResourceError) => {
          if (attempt === generation) {
            status = 'error';
            options.hooks?.onLoadError?.(error);
          }
          throw error;
        },
      );
    return promise;
  }

  return {
    get,
    get status() {
      return status;
    },
    preload: () => (preloadPromise ??= get().then(() => undefined)),
    reset() {
      generation++;
      promise = undefined;
      preloadPromise = undefined;
      components.clear();
      status = 'unresolved';
    },
    component(member, map) {
      const key = map ?? member;
      let component = components.get(key);
      if (!component) {
        component = lazy(async () => {
          const attempt = generation;
          const selected = await get();
          try {
            const candidate = map
              ? map(selected)
              : member === undefined
                ? selected
                : (selected as Record<PropertyKey, unknown>)[member];
            if (typeof candidate !== 'function') {
              throw new LazyResourceStateNotFoundError(
                options.label,
                String(member),
              );
            }
            return { default: candidate as ComponentType<any> };
          } catch (error) {
            if (attempt === generation && isLazyResourceError(error)) {
              status = 'error';
              options.hooks?.onLoadError?.(error);
            }
            throw error;
          }
        });
        components.set(key, component);
      }
      return component;
    },
  };
}
