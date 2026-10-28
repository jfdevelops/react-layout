import { type ComponentProps, type ComponentType } from 'react';
import { LazyResourceModuleShapeError } from '../errors/lazy-resource-error';
import { componentPropDefinitionsSymbol } from '@jfdevelops/react-layout-validator';
import type { ResourcePath, ResourceDefinition } from '../resource';
import { definedResourceLayoutComponentSymbol } from './render-state';
import {
  createLazyLoader,
  type LazyResourceLoadHooks,
} from '../lazy/create-lazy-loader';
import { LazyBoundary } from '../lazy/lazy-boundary';
import type {
  LazyHandle,
  LazyOptions,
  LazyResourceStates,
} from '../lazy/types';
export type {
  LazyResourceErrorComponent,
  LazyResourceLoadingComponent,
  LazyResourceStates,
} from '../lazy/types';
export type { LazyResourceLoadHooks } from '../lazy/create-lazy-loader';

type DefinedLayoutComponent = ComponentType<any> & {
  readonly [definedResourceLayoutComponentSymbol]: true;
};

type UnwrapDefinedLayout<Export> = Export extends DefinedLayoutComponent
  ? Export
  : Export extends { Root: infer Root extends DefinedLayoutComponent }
    ? Root
    : never;

type DefinedLayoutFromModule<Module> = UnwrapDefinedLayout<
  Module[keyof Module]
>;

type LazyUnsupportedStatic =
  | 'makeComposable'
  | 'props'
  | 'resource'
  | typeof componentPropDefinitionsSymbol
  | typeof definedResourceLayoutComponentSymbol;

/**
 * Public surface available before a lazy module resolves. Component metadata
 * and composition factories are intentionally omitted because they cannot be
 * read synchronously without loading the module.
 */
export type LazyResourceLayoutComponent<Module> = ComponentType<
  ComponentProps<DefinedLayoutFromModule<Module>>
> &
  LazyHandle &
  Pick<
    DefinedLayoutFromModule<Module>,
    Exclude<keyof DefinedLayoutFromModule<Module>, LazyUnsupportedStatic>
  >;

/** Lazy resource options, sharing import and fallback semantics with lazy states. */
export type LazyResourceLayoutOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Module extends Record<string, unknown>,
> = LazyOptions<Module> & {
  resource: ResourcePath<Resources>;
  states?: LazyResourceStates<ResourcePath<Resources>>;
};

function findDefinedLayoutComponent(
  module: Record<string, unknown>,
  resource: string,
) {
  const components = Object.values(module)
    .map((value) =>
      typeof value === 'object' && value !== null && 'Root' in value
        ? value.Root
        : value,
    )
    .filter(
      (value): value is DefinedLayoutComponent =>
        typeof value === 'function' &&
        definedResourceLayoutComponentSymbol in value,
    );
  if (components.length !== 1)
    throw new LazyResourceModuleShapeError(resource, components.length);
  return components[0];
}

/** Cached resource component and its compound states, backed by the shared loader. */
export function createLazyResourceLayout<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Module extends Record<string, unknown>,
>(
  options: LazyResourceLayoutOptions<Resources, Module>,
  defaults: LazyResourceStates<any>,
  hooks: LazyResourceLoadHooks = {},
): LazyResourceLayoutComponent<Module> {
  const runtime = options as unknown as LazyOptions<Module> & {
    resource: string;
    states?: LazyResourceStates;
  };
  const resource = runtime.resource;
  const states = { ...defaults, ...runtime.states } as LazyResourceStates;
  const loader = createLazyLoader({
    load: runtime.load,
    select: (module) => findDefinedLayoutComponent(module, resource),
    label: resource,
    hooks,
  });
  const members = new Map<string, ComponentType<any>>();
  function createMember(member?: string) {
    function LazyMember(props: Record<string, unknown>) {
      const Loading = states.Loading;
      return (
        <LazyBoundary
          loader={loader}
          member={member}
          resource={resource}
          componentProps={props}
          ErrorComponent={states.Error}
          onMount={hooks.onMount}
          fallback={
            runtime.fallback !== undefined ? (
              runtime.fallback
            ) : Loading ? (
              <Loading resource={resource} />
            ) : null
          }
        />
      );
    }
    LazyMember.displayName = `LazyResource(${resource})${member ? `.${member}` : ''}`;
    Object.defineProperties(LazyMember, {
      preload: { value: loader.preload },
      status: { get: () => loader.status },
    });
    return LazyMember;
  }
  const Component = createMember();
  const reservedStatics = new Set<PropertyKey>([
    'makeComposable',
    'props',
    'resource',
    componentPropDefinitionsSymbol,
    definedResourceLayoutComponentSymbol,
    'contextTypes',
    'childContextTypes',
    'contextType',
    'propTypes',
    'defaultProps',
    'getDerivedStateFromProps',
    'getDerivedStateFromError',
    'getDefaultProps',
    '$$typeof',
    '_payload',
    '_init',
    'render',
    'compare',
    'type',
    'then',
    'catch',
    'finally',
    'toJSON',
    'asymmetricMatch',
    '__esModule',
    'default',
  ]);
  return new Proxy(Component, {
    get(target, property, receiver) {
      if (Reflect.has(target, property))
        return Reflect.get(target, property, receiver);
      if (
        typeof property !== 'string' ||
        reservedStatics.has(property) ||
        !/^[A-Z]/.test(property)
      )
        return undefined;
      let component = members.get(property);
      if (!component) {
        component = createMember(property);
        members.set(property, component);
      }
      return component;
    },
    has: (target, property) => Reflect.has(target, property),
  }) as unknown as LazyResourceLayoutComponent<Module>;
}
