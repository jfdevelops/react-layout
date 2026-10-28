import { createElement, useRef, type ComponentType } from 'react';
import type { LazyOptions, LazyResourceStates } from './types';
import { createLazyLoader } from './create-lazy-loader';
import { LazyBoundary } from './lazy-boundary';
import { inspectLazy, withLazyHandle } from './inspection';
import { LazyResourceModuleShapeError } from '../errors/lazy-resource-error';
import {
  definedRenderStateSymbol,
  findDefinedRenderState,
} from '../create-config/render-state';
import {
  isRenderableComponentType,
  resolveScopedRenderResult,
  type ScopedRenderResult,
} from '../create-config/for-resources/scoped-render';
import {
  inspectionId,
  type InspectionStore,
} from '@jfdevelops/react-layout-devtools-core';

export type ScopedComponentRenderFn<
  Props = Record<string, unknown>,
  Context = Record<string, ComponentType<any>>,
> = (props: Props, context: Context) => ScopedRenderResult;

export type ScopedLazyContent<Render> =
  | { render: Render; lazy?: never; fallback?: never }
  | {
      render?: never;
      lazy: LazyOptions['load'] | LazyOptions;
      fallback?: React.ReactNode;
    };

export type LazyEnvironment = {
  store: InspectionStore;
  parent: string;
  defaults: () => LazyResourceStates;
  states?: (
    resource: string,
    props: Record<string, unknown>,
  ) => LazyResourceStates;
};

export const scopedLazySymbol = Symbol('scopedLazy');

/** Content is imported only when rendered or preloaded, never during shell creation. */
export function createScopedLazyContent(
  input: {
    lazy: LazyOptions['load'] | LazyOptions;
    fallback?: React.ReactNode;
  },
  resource: string,
  label: string,
  environment?: LazyEnvironment,
) {
  const options =
    typeof input.lazy === 'function' ? { load: input.lazy } : input.lazy;
  const componentId = environment?.store.node({
    id: inspectionId('component'),
    kind: 'component',
    label,
    details: { resource },
  });
  if (componentId && environment) {
    environment.store.edge(environment.parent, componentId, 'declares');
  }
  const inspection = inspectLazy(label, environment?.store, componentId);
  if (componentId) {
    inspection.hooks.onMount = () =>
      inspection.store.mount(componentId, inspection.id);
  }
  const loader = createLazyLoader({
    load: options.load,
    label,
    hooks: inspection.hooks,
    async select(module) {
      const candidates = Object.values(module).filter(
        (value) =>
          isRenderableComponentType(value) ||
          (typeof value === 'object' &&
            value !== null &&
            definedRenderStateSymbol in value),
      );
      if (candidates.length !== 1)
        throw new LazyResourceModuleShapeError(label, candidates.length);
      const selected = candidates[0];
      const render =
        typeof selected === 'object' &&
        selected !== null &&
        definedRenderStateSymbol in selected
          ? (await findDefinedRenderState({ State: selected }, label)).render
          : (selected as ScopedComponentRenderFn);
      // The render callback runs as a React component so hooks remain legal.
      function Loaded({
        callProps,
        context,
      }: {
        callProps: Record<string, unknown>;
        context: Record<string, ComponentType<any>>;
      }) {
        if (
          typeof render !== 'function' ||
          (render as unknown as { prototype?: { isReactComponent?: unknown } })
            .prototype?.isReactComponent
        )
          return createElement(render as ComponentType<any>, callProps);
        return resolveScopedRenderResult(render(callProps, context), callProps);
      }
      return Loaded;
    },
  });
  const Content = withLazyHandle(function LazyScopedContent({
    callProps,
    context,
  }: {
    callProps: Record<string, unknown>;
    context: Record<string, ComponentType<any>>;
  }) {
    const defaults = environment?.defaults() ?? {};
    const fallbackStates = useRef<{
      props: Record<string, unknown>;
      states: LazyResourceStates;
    }>();
    const previous = fallbackStates.current;
    if (
      !previous ||
      Object.keys(previous.props).length !== Object.keys(callProps).length ||
      Object.keys(callProps).some(
        (key) => !Object.is(previous.props[key], callProps[key]),
      )
    ) {
      fallbackStates.current = {
        props: callProps,
        states: environment?.states?.(resource, callProps) ?? {},
      };
    }
    const nearest = fallbackStates.current!.states;
    const Loading = nearest.Loading ?? defaults.Loading;
    const fallback =
      input.fallback !== undefined ? input.fallback : options.fallback;
    return (
      <LazyBoundary
        loader={loader}
        resource={resource}
        componentProps={{ callProps, context }}
        ErrorComponent={nearest.Error ?? defaults.Error}
        onMount={inspection.hooks.onMount}
        fallback={
          fallback !== undefined ? (
            fallback
          ) : Loading ? (
            <Loading resource={resource} />
          ) : null
        }
      />
    );
  }, loader);
  inspection.store.attach(Content);
  return Content;
}
