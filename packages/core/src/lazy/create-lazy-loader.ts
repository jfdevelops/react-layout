import { createElement, type ComponentType } from 'react';
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
    map?: (selected: Selected) => ComponentType<any>
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
  let settled:
    { ok: true; value: Selected } | { ok: false; error: unknown } | undefined;
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
            cause
          );
        }
        throw new ResourceModuleLoadError(options.label, cause);
      })
      .then(options.select)
      .then(
        (selected) => {
          if (attempt === generation) {
            settled = { ok: true, value: selected };
            status = 'resolved';
            options.hooks?.onLoadSuccess?.();
          }
          return selected;
        },
        (error: LazyResourceError) => {
          if (attempt === generation) {
            settled = { ok: false, error };
            status = 'error';
            options.hooks?.onLoadError?.(error);
          }
          throw error;
        }
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
      settled = undefined;
      components.clear();
      status = 'unresolved';
    },
    component(member, map) {
      const key = map ?? member;
      let component = components.get(key);
      if (!component) {
        let resolved:
          | { generation: number; ok: true; value: ComponentType<any> }
          | { generation: number; ok: false; error: unknown }
          | undefined;
        // Every member reads the same module result. Throw only while that
        // shared import is pending, rather than starting a promise per member.
        // Keep this component stable so later renders preserve child state.
        component = function LazyMember(props: Record<string, unknown>) {
          if (!settled) throw get();
          if (!settled.ok) throw settled.error;
          if (!resolved || resolved.generation !== generation) {
            try {
              const candidate = map
                ? map(settled.value)
                : member === undefined
                  ? settled.value
                  : (settled.value as Record<PropertyKey, unknown>)[member];
              if (typeof candidate !== 'function') {
                throw new LazyResourceStateNotFoundError(
                  options.label,
                  String(member)
                );
              }
              resolved = {
                generation,
                ok: true,
                value: candidate as ComponentType<any>,
              };
            } catch (error) {
              resolved = { generation, ok: false, error };
              if (isLazyResourceError(error)) {
                status = 'error';
                options.hooks?.onLoadError?.(error);
              }
            }
          }
          if (!resolved.ok) throw resolved.error;
          return createElement(resolved.value, props);
        };
        components.set(key, component);
      }
      return component;
    },
  };
}
