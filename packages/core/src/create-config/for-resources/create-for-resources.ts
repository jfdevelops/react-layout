import { RenderStateNameContext } from '../render-state-context';
import {
  createScopedLazyContent,
  scopedLazySymbol,
  type LazyEnvironment,
  type ScopedLazyContent,
} from '../../lazy/scoped-content';
import { withLazyHandle } from '../../lazy/inspection';
import type { LazyHandle } from '../../lazy/types';
import {
  createContext,
  createElement,
  type ComponentType,
  type JSX,
  useContext,
} from 'react';
import type { ComposableComponents } from '@jfdevelops/react-layout-composables';
import {
  type AnyBuiltPropDefinition,
  validateProps,
} from '@jfdevelops/react-layout-validator';
import type { InPropsDefinition, InPropsObject } from '../../props';
import type { LayoutResourceKey, ResourceDefinition } from '../../resource';
import { capitalize } from '../../utils/capitalize';
import { LayoutConfigurationError } from '../../errors';
import type { LayoutIncludeProps } from '../define-layout';
import type {
  CapitalizedResource,
  ResourcesLayoutName,
} from './resource-selection';
import type { CreateResourceLayoutForResourcesFn } from './scoped-layout';
import {
  isRenderableComponentType,
  reservedScopedComponentNames,
  resolveScopedRenderResult,
  type ScopedRenderResult,
  withScopedCompoundStatics,
} from './scoped-render';

type CreateForResourcesOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = {
  lazyEnvironment?: LazyEnvironment;
  createLayoutForResource: (
    defaultName: string | undefined,
    resource: LayoutResourceKey<Resources>,
  ) => unknown;
  createMakeComposableLayout?: () => (
    options: Record<string, unknown>,
  ) => unknown;
  createResourceLayout: (options: Record<string, unknown>) => unknown;
  getComponentPropDefinitions: (
    resource: LayoutResourceKey<Resources>,
  ) => Record<string, AnyBuiltPropDefinition>;
};

export function createForResources<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables>,
  CustomProps extends InPropsObject,
>({
  createLayoutForResource,
  createMakeComposableLayout,
  createResourceLayout,
  getComponentPropDefinitions,
  lazyEnvironment,
}: CreateForResourcesOptions<Resources>) {
  return ((...resourcesOrOptions: Array<unknown>) => {
    const firstArgument = resourcesOrOptions[0];
    let resourceOptions: Array<{
      resource: LayoutResourceKey<Resources>;
      name?:
        | string
        | ((
            resource: CapitalizedResource<LayoutResourceKey<Resources>>,
          ) => string);
    }>;

    if (typeof firstArgument === 'string') {
      resourceOptions = resourcesOrOptions.map((resource) => ({
        resource: resource as LayoutResourceKey<Resources>,
      }));
    } else if (
      firstArgument !== null &&
      typeof firstArgument === 'object' &&
      'resources' in firstArgument &&
      Array.isArray(firstArgument.resources)
    ) {
      const { name, resources } = firstArgument as {
        name?: ResourcesLayoutName<LayoutResourceKey<Resources>>;
        resources: Array<LayoutResourceKey<Resources>>;
      };
      resourceOptions = resources.map((resource) => ({
        name: typeof name === 'function' ? name : name?.[resource],
        resource,
      }));
    } else {
      resourceOptions = Object.entries(firstArgument ?? {}).map(
        ([resource, options]) => ({
          ...(options as {
            name?:
              | string
              | ((
                  resource: CapitalizedResource<LayoutResourceKey<Resources>>,
                ) => string);
          }),
          resource: resource as LayoutResourceKey<Resources>,
        }),
      );
    }

    const defaultNames = new Map(
      resourceOptions.map(({ name, resource }) => [
        resource,
        typeof name === 'function'
          ? name(
              capitalize(resource) as CapitalizedResource<
                LayoutResourceKey<Resources>
              >,
            )
          : name,
      ]),
    );

    function scopedCreateResourceLayout(options: Record<string, unknown>) {
      const resource = options.resource as LayoutResourceKey<Resources>;

      return createResourceLayout({
        ...options,
        name: options.name ?? defaultNames.get(resource),
      });
    }

    function scopedForResource(options: {
      name?: string;
      resource: LayoutResourceKey<Resources>;
    }) {
      return createLayoutForResource(
        options.name ?? defaultNames.get(options.resource),
        options.resource,
      );
    }

    type ScopedComponentRenderFn = (
      props: Record<string, unknown>,
      components: Record<string, (props?: never) => JSX.Element>,
    ) => ScopedRenderResult;

    type ScopedResourceScopedComponentDefinition = {
      props?: Record<string, AnyBuiltPropDefinition>;
      [scopedLazySymbol]?: LazyHandle;
    } & ScopedLazyContent<ScopedComponentRenderFn>;

    type ScopedComponentEntry = {
      [option: string]: unknown;
      name?: string;
      props?: CreateComponentPropsBag;
      components?: Record<string, ScopedResourceScopedComponentDefinition>;
      render: ScopedComponentRenderFn;
      [scopedLazySymbol]?: LazyHandle;
    };

    type CreateComponentPropsBag = {
      include?: Record<string, true | 'optional'>;
      custom?: Record<string, AnyBuiltPropDefinition>;
      defined?: Record<string, unknown>;
    };

    function normalizeContent<
      T extends {
        render?: ScopedComponentRenderFn;
        lazy?: unknown;
        fallback?: React.ReactNode;
        [scopedLazySymbol]?: LazyHandle;
      },
    >(
      definition: T,
      resource: string,
      label: string,
    ): T & {
      render: ScopedComponentRenderFn;
      [scopedLazySymbol]?: LazyHandle;
    } {
      if (definition.lazy !== undefined && definition.render !== undefined)
        throw new LayoutConfigurationError(
          `Scoped content "${label}" must define render or lazy, never both`,
        );
      if (definition[scopedLazySymbol])
        return definition as T & {
          render: ScopedComponentRenderFn;
          [scopedLazySymbol]?: LazyHandle;
        };
      if (definition.lazy === undefined) {
        if (typeof definition.render !== 'function')
          throw new LayoutConfigurationError(
            `Scoped content "${label}" requires render or lazy`,
          );
        return definition as T & {
          render: ScopedComponentRenderFn;
          [scopedLazySymbol]?: LazyHandle;
        };
      }
      const Content = createScopedLazyContent(
        definition as Parameters<typeof createScopedLazyContent>[0],
        resource,
        label,
        lazyEnvironment,
      );
      const result = {
        ...definition,
        lazy: undefined,
        render: (
          callProps: Record<string, unknown>,
          context: Record<string, (props?: never) => JSX.Element>,
        ) => createElement(Content, { callProps, context }),
        [scopedLazySymbol]: Content,
      };
      return withLazyHandle(result, Content) as T & {
        render: ScopedComponentRenderFn;
        [scopedLazySymbol]?: LazyHandle;
      };
    }

    function aggregateHandle(handles: LazyHandle[]): LazyHandle {
      let imports: Promise<void>[] = [];
      let pending: Promise<void> | undefined;
      return {
        preload() {
          const next = handles.map((handle) => handle.preload());
          if (
            !pending ||
            next.some((promise, index) => promise !== imports[index])
          ) {
            imports = next;
            pending = Promise.all(next).then(() => undefined);
          }
          return pending;
        },
        get status() {
          if (handles.some((handle) => handle.status === 'error'))
            return 'error';
          if (handles.some((handle) => handle.status === 'loading'))
            return 'loading';
          if (handles.some((handle) => handle.status === 'unresolved'))
            return 'unresolved';
          return 'resolved';
        },
      };
    }

    function mergeCreateComponentProps(
      ...bags: Array<CreateComponentPropsBag | undefined>
    ): CreateComponentPropsBag {
      const include: Record<string, true | 'optional'> = {};
      const custom: Record<string, AnyBuiltPropDefinition> = {};

      for (const bag of bags) {
        Object.assign(include, bag?.include);
        Object.assign(custom, bag?.custom);

        for (const key of Object.keys(bag?.defined ?? {})) {
          include[key] = true;
        }
      }

      return { include, custom };
    }

    function createComponent(componentOptions: {
      props?: {
        include?: Record<string, true | 'optional'>;
        custom?: Record<string, AnyBuiltPropDefinition>;
      };
      resources?: Record<string, ScopedComponentEntry>;
      render?: ScopedComponentRenderFn;
      lazy?: Parameters<typeof createScopedLazyContent>[0]['lazy'];
      fallback?: React.ReactNode;
    }) {
      const mergedProps = mergeCreateComponentProps(
        componentOptions.props,
        ...Object.values(componentOptions.resources ?? {}).map(
          (entry) => entry.props,
        ),
      );
      const include = mergedProps.include ?? {};
      const custom = mergedProps.custom ?? {};
      const selectedResources = new Set(
        resourceOptions.map(({ resource }) => resource),
      );
      const topLevelContent = new Map(
        [...selectedResources].map((resource) => [
          resource,
          normalizeContent(componentOptions, resource, `${resource}:content`),
        ]),
      );
      const componentPropsContext = createContext<
        Record<string, unknown> | undefined
      >(undefined);
      const definedEntries = new Map<
        LayoutResourceKey<Resources>,
        ScopedComponentEntry
      >();

      for (const [key, entry] of Object.entries(
        componentOptions.resources ?? {},
      )) {
        const resource = key as LayoutResourceKey<Resources>;

        if (!selectedResources.has(resource)) {
          throw new LayoutConfigurationError(
            `Resource "${key}" is not available in this scoped component`,
          );
        }

        const normalized = normalizeContent(entry, resource, resource);
        normalized.components = Object.fromEntries(
          Object.entries(entry.components ?? {}).map(([name, definition]) => [
            name,
            normalizeContent(definition, resource, `${resource}.${name}`),
          ]),
        );
        definedEntries.set(resource, normalized);
      }

      /** Resolved scoped components, per resource. */
      const resourceScopedComponents = new Map<
        LayoutResourceKey<Resources>,
        Record<string, (props?: never) => JSX.Element>
      >();
      const contextResources = new Map<string, LayoutResourceKey<Resources>>();
      const renderContext: Record<string, (props: never) => JSX.Element> =
        Object.fromEntries(
          [...definedEntries].map(([resource, entry]) => {
            const contextKey = capitalize(resource);

            if (contextKey === 'Root') {
              throw new LayoutConfigurationError(
                `Resource "${resource}" maps to the reserved render context key "Root"`,
              );
            }

            const existingResource = contextResources.get(contextKey);

            if (existingResource !== undefined) {
              throw new LayoutConfigurationError(
                `Resources "${existingResource}" and "${resource}" both map to render context key "${contextKey}"`,
              );
            }

            contextResources.set(contextKey, resource);

            /**
             * Built once per resource so every scoped component keeps a stable
             * identity, and shared by the resource render, the render context,
             * and any component bound through `asHOF()`.
             */
            const scopedComponents: Record<
              string,
              (props?: never) => JSX.Element
            > = {};

            for (const [name, definition] of Object.entries(
              entry.components ?? {},
            )) {
              if (reservedScopedComponentNames.has(name)) {
                throw new LayoutConfigurationError(
                  `Scoped component "${name}" for resource "${resource}" uses a reserved name`,
                );
              }

              const ownPropDefinitions = definition.props ?? {};
              // Last call-site own-props / returned component for this scoped
              // entry. Compound statics re-run `render` with these so
              // `<DataTable variant="b" />` then `<DataTable.Loading />` sees "b".
              let cachedOwnProps: Record<string, unknown> = {};
              let cachedState: string | undefined;
              let cachedReturnedComponent:
                | ComponentType<Record<string, unknown>>
                | undefined;

              function ScopedComponent(ownProps?: Record<string, unknown>) {
                const state = useContext(RenderStateNameContext);
                const componentProps = useContext(componentPropsContext);

                if (componentProps === undefined) {
                  throw new LayoutConfigurationError(
                    `Scoped component "${name}" must be rendered inside its scoped component`,
                  );
                }

                const resolvedOwnProps = ownProps ?? {};
                cachedOwnProps = resolvedOwnProps;

                validateProps(ownPropDefinitions, resolvedOwnProps, {
                  layoutName:
                    entry.name ??
                    defaultNames.get(resource) ??
                    capitalize(resource),
                  resource,
                });

                // Mount a returned component type with call-site props; pass
                // nodes (elements, portals, null) through unchanged.
                const result = definition.render!(
                  { ...componentProps, ...resolvedOwnProps, resource },
                  { ...scopedComponents, state } as unknown as typeof scopedComponents,
                );

                if (isRenderableComponentType(result)) {
                  cachedState = state;
                  cachedReturnedComponent = result as ComponentType<
                    Record<string, unknown>
                  >;
                }

                return resolveScopedRenderResult(result, resolvedOwnProps);
              }

              // Types expose compound statics from the returned component
              // (`DataTable.Loading`); attach matching runtime wrappers.
              if (definition[scopedLazySymbol])
                withLazyHandle(ScopedComponent, definition[scopedLazySymbol]);
              scopedComponents[name] = withScopedCompoundStatics(
                ScopedComponent,
                (staticName) => {
                  function CompoundStatic(ownProps?: Record<string, unknown>) {
                    const state = useContext(RenderStateNameContext);
                    const componentProps = useContext(componentPropsContext);

                    if (componentProps === undefined) {
                      throw new LayoutConfigurationError(
                        `Scoped component "${name}.${staticName}" must be rendered inside its scoped component`,
                      );
                    }

                    // Prefer the component from the last parent call (same
                    // closure as that call's own-props). Fall back to re-running
                    // render with cached parent props when needed.
                    let result: unknown = cachedState === state ? cachedReturnedComponent : undefined;

                    if (!isRenderableComponentType(result)) {
                      result = definition.render!(
                        {
                          ...componentProps,
                          ...cachedOwnProps,
                          resource,
                        },
                        { ...scopedComponents, state } as unknown as typeof scopedComponents,
                      );
                    }

                    if (!isRenderableComponentType(result)) {
                      throw new LayoutConfigurationError(
                        `Scoped component "${name}" must return a component type to use static "${staticName}"`,
                      );
                    }

                    const staticComponent = (
                      result as ComponentType<Record<string, unknown>> &
                        Record<string, unknown>
                    )[staticName];

                    if (!isRenderableComponentType(staticComponent)) {
                      throw new LayoutConfigurationError(
                        `Scoped component "${name}" has no component static "${staticName}"`,
                      );
                    }

                    // Loading's props — those mount the static itself.
                    return createElement(staticComponent, ownProps ?? {});
                  }

                  CompoundStatic.displayName = `${name}.${staticName}`;
                  return CompoundStatic;
                },
              ) as (props?: never) => JSX.Element;
            }

            resourceScopedComponents.set(resource, scopedComponents);

            function ResourceRender(ownProps?: Record<string, unknown>) {
              const state = useContext(RenderStateNameContext);
              const componentProps = useContext(componentPropsContext);

              if (componentProps === undefined) {
                throw new LayoutConfigurationError(
                  `Render context component "${contextKey}" must be rendered inside its scoped component`,
                );
              }

              // Call-site props on `context.Users({ title, heading })` merge into
              // the resource render props and mount a returned component type.
              const callProps = { ...componentProps, ...ownProps, resource };
              return resolveScopedRenderResult(
                entry.render(callProps, { ...scopedComponents, state } as unknown as typeof scopedComponents),
                ownProps,
              );
            }

            return [
              contextKey,
              withLazyHandle(
                Object.assign(ResourceRender, scopedComponents),
                aggregateHandle([
                  ...(entry[scopedLazySymbol] ? [entry[scopedLazySymbol]] : []),
                  ...Object.values(entry.components ?? {}).flatMap(
                    (definition) =>
                      definition[scopedLazySymbol]
                        ? [definition[scopedLazySymbol]]
                        : [],
                  ),
                ]),
              ),
            ];
          }),
        );

      /**
       * Layouts are created once per resource and cached. Creating one during
       * render would hand React a new component type on every pass, remounting
       * the whole subtree.
       */
      const roots = new Map<
        LayoutResourceKey<Resources>,
        (props: Record<string, unknown>) => JSX.Element
      >();

      function Root(rootProps: Record<string, unknown>) {
        const componentProps = useContext(componentPropsContext);

        if (componentProps === undefined) {
          throw new LayoutConfigurationError(
            'Render context component "Root" must be rendered inside its scoped component',
          );
        }

        const resource =
          componentProps.resource as LayoutResourceKey<Resources>;
        let root = roots.get(resource);

        if (root === undefined) {
          const entry = definedEntries.get(resource);

          if (entry === undefined) {
            throw new LayoutConfigurationError(
              `Render context component "Root" requires a "resources.${resource}" entry to build the layout for resource "${resource}"`,
            );
          }

          // Layout option values come from the outer component call site
          // (`<Directory title="…" />`), not from the resource entry.
          const availableDefinitions = getComponentPropDefinitions(resource);
          const layoutOptions: Record<string, unknown> = {};
          const defined = entry.props?.defined ?? {};

          for (const key of Object.keys(availableDefinitions)) {
            if (key in defined) {
              layoutOptions[key] = defined[key];
            }

            const capitalized = capitalize(key);
            if (capitalized in defined) {
              layoutOptions[capitalized] = defined[capitalized];
            }

            if (key in componentProps) {
              layoutOptions[key] = componentProps[key];
            }

            if (capitalized in componentProps) {
              layoutOptions[capitalized] = componentProps[capitalized];
            }
          }

          root = scopedCreateResourceLayout({
            ...layoutOptions,
            namespace: false,
            name:
              entry.name ?? defaultNames.get(resource) ?? capitalize(resource),
            resource,
          }) as (props: Record<string, unknown>) => JSX.Element;
          roots.set(resource, root);
        }

        const entry = definedEntries.get(resource);
        const definedCustom: Record<string, unknown> = {};
        const forwardedRootProps: Record<string, unknown> = {};

        for (const key of Object.keys(getComponentPropDefinitions(resource))) {
          if (key in componentProps) {
            forwardedRootProps[key] = componentProps[key];
          }

          const capitalized = capitalize(key);
          if (capitalized in componentProps) {
            forwardedRootProps[capitalized] = componentProps[capitalized];
          }
        }

        for (const [key, value] of Object.entries(
          entry?.props?.defined ?? {},
        )) {
          if (key in custom) {
            definedCustom[key] = value;
          }
        }

        return createElement(root, {
          ...forwardedRootProps,
          ...definedCustom,
          ...rootProps,
        });
      }

      renderContext.Root = Root;

      function Component(componentProps: Record<string, unknown>) {
        const state = useContext(RenderStateNameContext);
        const componentResource =
          componentProps.resource as LayoutResourceKey<Resources>;

        if (!selectedResources.has(componentResource)) {
          throw new LayoutConfigurationError(
            `Resource "${componentResource}" is not available in this scoped component`,
          );
        }

        const defined =
          definedEntries.get(componentResource)?.props?.defined ?? {};
        const resolvedComponentProps = { ...defined, ...componentProps };
        const availableDefinitions =
          getComponentPropDefinitions(componentResource);
        const definitionsToValidate: Record<string, AnyBuiltPropDefinition> =
          {};

        for (const [key, inclusion] of Object.entries(include)) {
          const definition = availableDefinitions[key];

          if (!definition) {
            continue;
          }

          // Keep declared keys as-is — do not capitalize JSX.Element props.
          if (inclusion === true || key in resolvedComponentProps) {
            definitionsToValidate[key] = definition;
          }
        }

        for (const [key, definition] of Object.entries(custom)) {
          if (key === 'children' || key === 'resource') {
            continue;
          }

          definitionsToValidate[key] = definition;
        }

        validateProps(definitionsToValidate, resolvedComponentProps, {
          layoutName:
            definedEntries.get(componentResource)?.name ??
            defaultNames.get(componentResource) ??
            capitalize(componentResource),
          resource: componentResource,
        });

        // Top-level render may return a component type; mount it with the full
        // component props (include/custom + inferred return-type props).
        return createElement(
          componentPropsContext.Provider,
          { value: resolvedComponentProps },
          resolveScopedRenderResult(
            topLevelContent
              .get(componentResource)!
              .render(
                resolvedComponentProps,
                { ...renderContext, state } as unknown as Record<string, (props?: never) => JSX.Element>,
              ),
            resolvedComponentProps,
          ),
        );
      }

      /**
       * Bound components are created once per resource and cached. Returning a
       * fresh component from the factory would hand React a new component type
       * whenever the caller rebinds, remounting the subtree.
       */
      const boundComponents = new Map<
        LayoutResourceKey<Resources>,
        (props: Record<string, unknown>) => JSX.Element
      >();

      function bindResource(resource: LayoutResourceKey<Resources>) {
        if (!selectedResources.has(resource)) {
          throw new LayoutConfigurationError(
            `Resource "${resource}" is not available in this scoped component`,
          );
        }

        let boundComponent = boundComponents.get(resource);

        if (boundComponent === undefined) {
          boundComponent = Object.assign(
            (boundProps: Record<string, unknown>) =>
              createElement(Component, { ...boundProps, resource }),
            {
              displayName: `ScopedResourceComponent(${resource})`,
              props: undefined,
              resource: undefined,
            },
            resourceScopedComponents.get(resource) ?? {},
          );
          if (createMakeComposableLayout) {
            Object.assign(boundComponent, {
              makeComposable: (options: Record<string, unknown> = {}) =>
                scopedExtras.makeComposable?.({ ...options, resource }),
            });
          }
          const renderResource = renderContext[
            capitalize(resource)
          ] as unknown as LazyHandle;
          const ownContent = topLevelContent.get(resource)?.[scopedLazySymbol];
          withLazyHandle(
            boundComponent,
            aggregateHandle([
              ...(renderResource ? [renderResource] : []),
              ...(ownContent ? [ownContent] : []),
            ]),
          );
          boundComponents.set(resource, boundComponent);
        }

        return boundComponent;
      }

      function asHOF() {
        return bindResource;
      }

      withLazyHandle(
        Component,
        aggregateHandle([
          ...(Object.values(renderContext).filter(
            (value) => 'preload' in value,
          ) as unknown as LazyHandle[]),
          ...[...topLevelContent.values()].flatMap((entry) =>
            entry[scopedLazySymbol] ? [entry[scopedLazySymbol]] : [],
          ),
        ]),
      );
      return Object.assign(Component, {
        asHOF,
        displayName: 'ScopedResourceComponent',
        props: undefined,
      });
    }

    function createComponentSetProps(baseProps: CreateComponentPropsBag) {
      function createWithProps(componentOptions: {
        props?: CreateComponentPropsBag;
        resources?: Record<string, ScopedComponentEntry>;
        render: (
          props: Record<string, unknown>,
          context: Record<string, (props: never) => JSX.Element>,
        ) => ScopedRenderResult;
      }) {
        return createComponent({
          ...componentOptions,
          props: mergeCreateComponentProps(baseProps, componentOptions.props),
        });
      }

      createWithProps.createResourceComponents = createResourceComponents;

      return createWithProps;
    }

    function createResourceComponents(options: {
      resource: LayoutResourceKey<Resources>;
      props?: CreateComponentPropsBag;
      name?: string;
      components?: Record<string, ScopedResourceScopedComponentDefinition>;
      render?: ScopedComponentRenderFn;
      lazy?: Parameters<typeof createScopedLazyContent>[0]['lazy'];
      fallback?: React.ReactNode;
    }) {
      const { resource, props, ...entry } = options;

      if (
        !resourceOptions.some(
          (resourceOption) => resourceOption.resource === resource,
        )
      ) {
        throw new LayoutConfigurationError(
          `Resource "${resource}" is not available in this scoped component`,
        );
      }

      const normalized = normalizeContent(entry, resource, String(resource));
      const components = Object.fromEntries(
        Object.entries(normalized.components ?? {}).map(
          ([name, definition]) => [
            name,
            normalizeContent(definition, resource, `${resource}.${name}`),
          ],
        ),
      );
      const result = { ...normalized, components, props: props ?? {} };
      return withLazyHandle(
        result,
        aggregateHandle([
          ...(normalized[scopedLazySymbol]
            ? [normalized[scopedLazySymbol]]
            : []),
          ...Object.values(components).flatMap((definition) =>
            definition[scopedLazySymbol] ? [definition[scopedLazySymbol]] : [],
          ),
        ]),
      );
    }

    Object.assign(createComponent, {
      setProps: createComponentSetProps,
    });

    const scopedExtras: {
      createComponent: typeof createComponent;
      createResourceComponents: typeof createResourceComponents;
      forResource: typeof scopedForResource;
      makeComposable?: (options: Record<string, unknown>) => unknown;
      resources: undefined;
    } = {
      createComponent,
      createResourceComponents,
      forResource: scopedForResource,
      resources: undefined,
    };

    if (createMakeComposableLayout) {
      const makeComposableLayout = createMakeComposableLayout();

      scopedExtras.makeComposable = (options) => {
        const resource = options.resource as LayoutResourceKey<Resources>;

        return makeComposableLayout({
          ...options,
          name: options.name ?? defaultNames.get(resource),
        });
      };
    }

    return Object.assign(scopedCreateResourceLayout, scopedExtras);
  }) as unknown as CreateResourceLayoutForResourcesFn<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    CustomProps
  >;
}
