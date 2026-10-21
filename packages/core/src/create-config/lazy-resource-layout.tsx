import {
  Component,
  type ComponentProps,
  type ComponentType,
  type JSX,
  lazy,
  Suspense,
  useReducer,
  useRef,
} from 'react';
import {
  LayoutConfigurationError,
  ResourceModuleLoadError,
} from '../errors';
import { componentPropDefinitionsSymbol } from '@jfdevelops/react-layout-validator';
import type { ResourcePath, ResourceDefinition } from '../resource';
import { definedResourceLayoutComponentSymbol } from './render-state';

type DefinedLayoutComponent = ComponentType<any> & {
  readonly [definedResourceLayoutComponentSymbol]: true;
};

type DefinedLayoutFromModule<Module> = Extract<
  Module[keyof Module],
  DefinedLayoutComponent
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
  Pick<
    DefinedLayoutFromModule<Module>,
    Exclude<keyof DefinedLayoutFromModule<Module>, LazyUnsupportedStatic>
  >;

/** Component rendered while a resource module or one of its states is loading. */
export type LazyResourceLoadingComponent = ComponentType;
/**
 * Component rendered when a resource module cannot be loaded. Calling
 * `retry` discards React's rejected lazy cache entry and imports it again.
 */
export type LazyResourceErrorComponent = ComponentType<{
  error: unknown;
  retry: () => void;
}>;

/** Loading and module-error UI used around a lazy resource component. */
export type LazyResourceStates = {
  Error?: LazyResourceErrorComponent;
  Loading?: LazyResourceLoadingComponent;
};

/**
 * Configuration for a lazy resource component. `resource` is checked against
 * the bound resource paths, including dot-delimited subresources, and `load`
 * must resolve to a module with exactly one created resource component.
 */
export type LazyResourceLayoutOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Module extends Record<string, unknown>,
> = {
  load: () => Promise<Module>;
  resource: ResourcePath<Resources>;
  states?: LazyResourceStates;
};

type BoundaryProps = {
  children: JSX.Element;
  ErrorComponent?: LazyResourceErrorComponent;
  onRetry: () => void;
};

type BoundaryState = {
  error?: unknown;
};

class LazyResourceErrorBoundary extends Component<
  BoundaryProps,
  BoundaryState
> {
  state: BoundaryState = {};

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { error };
  }

  retry = () => {
    this.props.onRetry();
    this.setState({ error: undefined });
  };

  render() {
    if (this.state.error !== undefined) {
      const { ErrorComponent } = this.props;

      if (!ErrorComponent) {
        throw this.state.error;
      }

      return <ErrorComponent error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

function findDefinedLayoutComponent(module: Record<string, unknown>) {
  const components = Object.values(module).filter(
    (value): value is DefinedLayoutComponent =>
      typeof value === 'function' &&
      definedResourceLayoutComponentSymbol in value,
  );

  if (components.length !== 1) {
    throw new LayoutConfigurationError(
      `A lazy resource module must export exactly one created resource layout component; received ${components.length}`,
    );
  }

  return components[0];
}

/**
 * Creates a cached lazy proxy for a resource component and all of its compound
 * state components. This is normally called through
 * `defineResourceLayout.lazy(...)`, which supplies shared defaults.
 */
export function createLazyResourceLayout<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Module extends Record<string, unknown>,
>(
  options: LazyResourceLayoutOptions<Resources, Module>,
  defaults: LazyResourceStates,
): LazyResourceLayoutComponent<Module> {
  const runtimeOptions = options as {
    load: () => Promise<Record<string, unknown>>;
    resource: string;
    states?: LazyResourceStates;
  };
  let loadedComponentPromise: Promise<DefinedLayoutComponent> | undefined;
  const stateComponents = new Map<PropertyKey, ComponentType<any>>();
  const resolvedStates = { ...defaults, ...runtimeOptions.states };

  function loadComponent() {
    loadedComponentPromise ??= runtimeOptions
      .load()
      .then(findDefinedLayoutComponent)
      .catch((error: unknown) => {
        throw new ResourceModuleLoadError(runtimeOptions.resource, error);
      });

    return loadedComponentPromise;
  }

  function resetLoad() {
    loadedComponentPromise = undefined;
    stateComponents.clear();
  }

  function createMemberComponent(member?: PropertyKey) {
    function createLazyComponent() {
      return lazy(async () => {
        const component = await loadComponent();
        const selected =
          member === undefined
            ? component
            : (component as unknown as Record<PropertyKey, unknown>)[member];

        if (typeof selected !== 'function') {
          throw new LayoutConfigurationError(
            `Lazy resource "${runtimeOptions.resource}" does not define state "${String(member)}"`,
          );
        }

        return { default: selected as ComponentType<any> };
      });
    }

    function LazyMember(props: Record<string, unknown>) {
      const [, rerender] = useReducer((version) => version + 1, 0);
      const LazyComponent = useRef(createLazyComponent());
      const LoadingComponent = resolvedStates.Loading;
      const CurrentLazyComponent = LazyComponent.current;

      function retry() {
        resetLoad();
        LazyComponent.current = createLazyComponent();
        rerender();
      }

      return (
        <LazyResourceErrorBoundary
          ErrorComponent={resolvedStates.Error}
          onRetry={retry}
        >
          <Suspense
            fallback={LoadingComponent ? <LoadingComponent /> : null}
          >
            <CurrentLazyComponent {...props} />
          </Suspense>
        </LazyResourceErrorBoundary>
      );
    }

    const resourceName = runtimeOptions.resource;
    LazyMember.displayName =
      member === undefined
        ? `LazyResource(${resourceName})`
        : `LazyResource(${resourceName}).${String(member)}`;

    return LazyMember;
  }

  const Component = createMemberComponent();
  const unsupportedStatics = new Set<PropertyKey>([
    'makeComposable',
    'props',
    'resource',
    componentPropDefinitionsSymbol,
    definedResourceLayoutComponentSymbol,
  ]);

  return new Proxy(Component, {
    get(target, property, receiver) {
      if (Reflect.has(target, property)) {
        return Reflect.get(target, property, receiver);
      }

      if (typeof property !== 'string' || unsupportedStatics.has(property)) {
        return undefined;
      }

      const existing = stateComponents.get(property);

      if (existing) {
        return existing;
      }

      const stateComponent = createMemberComponent(property);
      stateComponents.set(property, stateComponent);

      return stateComponent;
    },
  }) as unknown as LazyResourceLayoutComponent<Module>;
}
