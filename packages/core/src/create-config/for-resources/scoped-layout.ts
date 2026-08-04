import type {
  ComposableComponents,
  ComposableResourceLayout,
} from '@jfdevelops/react-layout-composables';
import type { InPropsDefinition, InPropsObject } from '../../props';
import type { LayoutResourceKey, ResourceDefinition } from '../../resource';
import type {
  LayoutIncludeProps,
  LayoutPropsForResource,
  ResourceLayoutComponent,
} from '../define-layout';
import type {
  CreatedLayoutForResource,
  CreateLayoutForResourceOptions,
  CreateResourceLayoutOptionsBase,
  SetDefaultPropForResourceFn,
} from '../for-resource';
import type { ScopedCreateComponent } from './create-component';
import type {
  AtLeastOneResourceLayoutNameKey,
  AtLeastOneResourceLayoutSelection,
  CapitalizedResource,
  HasResourceLayoutName,
  MappedResourceLayoutArguments,
  ResourceLayoutNames,
  ResourceLayoutSelection,
  SelectedLayoutResources,
  SelectedResourceLayoutArguments,
  SelectedResourceLayoutName,
  SelectedResourceLayoutNames,
  SharedResourceLayoutArguments,
} from './resource-selection';

export type ScopedCreateResourceLayoutOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  Name extends string,
  Resource extends SelectedLayoutResources<Resources, Arguments>,
  Props extends InPropsObject,
> = LayoutPropsForResource<Resources, InProps, Composables> & {
  resource: Resource;
  props?: Props;
} & (HasResourceLayoutName<Arguments, Resource> extends true
    ? { name?: Name }
    : { name: Name });

export type ScopedCreateResourceLayoutFnImpl<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  CustomProps extends InPropsObject,
> = <
  Resource extends SelectedLayoutResources<Resources, Arguments>,
  Name extends string = SelectedResourceLayoutName<Arguments, Resource>,
  Props extends InPropsObject = {},
>(
  options: ScopedCreateResourceLayoutOptions<
    Resources,
    InProps,
    Composables,
    Arguments,
    Name,
    Resource,
    Props
  >,
) => ResourceLayoutComponent<Name, CustomProps, Composables, Resource>;

export type ScopedCreateLayoutForResource<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  CustomProps extends InPropsObject,
> = <
  Resource extends SelectedLayoutResources<Resources, Arguments>,
  Name extends string = SelectedResourceLayoutName<Arguments, Resource>,
>(
  options: CreateLayoutForResourceOptions<Resources, Name, Resource>,
) => CreatedLayoutForResource<
  Resources,
  InProps,
  Composables,
  Name,
  Resource,
  CustomProps
> & {
  setDefaults: SetDefaultPropForResourceFn<
    Resources,
    InProps,
    Composables,
    Name,
    Resource,
    CustomProps
  >;
};

export type ScopedCreateResourceLayoutMakeComposableFn<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
> = <
  Resource extends SelectedLayoutResources<Resources, Arguments>,
  Name extends string = SelectedResourceLayoutName<Arguments, Resource>,
  Props extends InPropsObject = {},
>(
  options: Omit<
    CreateResourceLayoutOptionsBase<Resources, Name, Resource>,
    'name'
  > &
    Partial<LayoutPropsForResource<Resources, InProps, Composables>> & {
      props?: Props;
    } & (HasResourceLayoutName<Arguments, Resource> extends true
      ? { name?: Name }
      : { name: Name }),
) => ComposableResourceLayout<Composables, Name, any, any, any>;

export type ScopedCreateResourceLayoutFn<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  CustomProps extends InPropsObject,
> = ScopedCreateResourceLayoutFnImpl<
  Resources,
  InProps,
  Composables,
  Arguments,
  CustomProps
> & {
  /**
   * Creates a component shared by the target resources. Included layout props
   * become component props, and `children` is always available as an optional
   * prop in both the render callback and at the call site.
   *
   * Each key of `resources` holds that resource's scoped `components` and
   * `render`. Layout option values like `title` are call-site props on
   * `context.<Resource>` / the outer component — not fields on the entry.
   * The render context exposes `Root` and one capitalized component per key
   * present in `resources`.
   *
   * Each entry may also declare `components` — components scoped to that
   * resource, available to the entry's own `render`, on `context.<Resource>`,
   * and on the component returned by `asHOF()`.
   *
   * @example
   * const Directory = createDirectoryLayout.createComponent({
   *   props: { include: { title: true, actions: 'optional' } },
   *   resources: {
   *     users: {
   *       components: {
   *         Toolbar: { render: ({ title }) => <nav>{title}</nav> },
   *       },
   *       render: ({ resource }, components) => (
   *         <>
   *           <components.Toolbar />
   *           <span>{resource}</span>
   *         </>
   *       ),
   *     },
   *     admins: {
   *       render: ({ resource }) => <span>{resource}</span>,
   *     },
   *   },
   *   render: ({ actions, children, resource }, context) => (
   *     <context.Root actions={actions}>
   *       {children}
   *       {resource === 'users' ? (
   *         <context.Users title="Users" />
   *       ) : (
   *         <context.Admins title="Admins" />
   *       )}
   *       <context.Users.Toolbar />
   *     </context.Root>
   *   ),
   * })
   *
   * <Directory resource='users' title='Users' />
   *
   * @param options The props configuration, per-resource entries, and the
   * shared component render function.
   * @returns A component scoped to the selected resources.
   */
  createComponent: ScopedCreateComponent<
    Resources,
    InProps,
    Composables,
    Arguments,
    CustomProps
  >;
  forResource: ScopedCreateLayoutForResource<
    Resources,
    InProps,
    Composables,
    Arguments,
    CustomProps
  >;
  /**
   * Type-only property containing the target resource union. This property is
   * `undefined` at runtime and exists solely for extracting the scoped type.
   *
   * @example
   * type AccountResource = typeof createAccountLayout.resources;
   */
  readonly resources: SelectedLayoutResources<Resources, Arguments>;
} & ([keyof Composables] extends [never]
    ? {}
    : {
        makeComposable: ScopedCreateResourceLayoutMakeComposableFn<
          Resources,
          InProps,
          Composables,
          Arguments
        >;
      });

export type CreateResourceLayoutForResourcesFn<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents = {},
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables> = {},
  CustomProps extends InPropsObject = {},
> = {
  /**
   * Creates a layout factory scoped to the listed resources.
   *
   * Layout names must be supplied when a layout is created.
   *
   * @example
   * createResourceLayout.forResources('users', 'admins')
   *
   * @param resources Resources available from the returned layout factory.
   * @returns A layout factory scoped to the selected resources.
   */
  <
    const ResourceKeys extends readonly [
      LayoutResourceKey<Resources>,
      ...Array<LayoutResourceKey<Resources>>,
    ],
  >(
    ...resources: ResourceKeys
  ): ScopedCreateResourceLayoutFn<
    Resources,
    InProps,
    Composables,
    ResourceKeys,
    CustomProps
  >;

  /**
   * Creates a layout factory scoped to a resource list without default names.
   *
   * @example
   * createResourceLayout.forResources({ resources: ['users', 'admins'] })
   *
   * @param options The resources to expose without configured default names.
   * @returns A layout factory scoped to the selected resources.
   */
  <
    const ResourceKeys extends ReadonlyArray<LayoutResourceKey<Resources>>,
  >(options: {
    resources: ResourceKeys;
    name?: never;
  }): ScopedCreateResourceLayoutFn<
    Resources,
    InProps,
    Composables,
    readonly [{ resources: ResourceKeys }],
    CustomProps
  >;

  /**
   * Creates a scoped layout factory with optional default names per resource.
   *
   * Each map key is limited to the resources selected in `resources`. Values
   * can be strings or callbacks receiving that resource's capitalized name.
   *
   * @example
   * createResourceLayout.forResources({
   *   resources: ['users', 'admins'],
   *   name: {
   *     users: resource => `${resource}Page`,
   *     admins: 'AdminDirectory',
   *   },
   * })
   *
   * @param options The selected resources and their optional default names.
   * @returns A layout factory scoped to the selected resources.
   */
  <
    const ResourceKeys extends ReadonlyArray<LayoutResourceKey<Resources>>,
    const CallbackName extends string,
    const Names,
  >(
    options: {
      resources: ResourceKeys;
      name: SelectedResourceLayoutNames<
        LayoutResourceKey<Resources>,
        NoInfer<ResourceKeys[number]>,
        CallbackName
      > &
        AtLeastOneResourceLayoutNameKey<NoInfer<ResourceKeys[number]>> &
        Record<
          string,
          NonNullable<
            ResourceLayoutNames<
              LayoutResourceKey<Resources>,
              CallbackName
            >[LayoutResourceKey<Resources>]
          >
        >;
    } & {
      name: Names & Record<Exclude<keyof Names, ResourceKeys[number]>, never>;
    },
  ): ScopedCreateResourceLayoutFn<
    Resources,
    InProps,
    Composables,
    MappedResourceLayoutArguments<Resources, ResourceKeys, Names, CallbackName>,
    CustomProps
  >;

  /**
   * Creates a scoped layout factory with one default-name callback shared by
   * every selected resource. The callback receives a capitalized resource
   * whose `toLowerCase()` result retains the corresponding literal type.
   *
   * @example
   * createResourceLayout.forResources({
   *   resources: ['users', 'admins'],
   *   name: resource => `${resource}Page`,
   * })
   *
   * @param options The selected resources and shared default-name callback.
   * @returns A layout factory scoped to the selected resources.
   */
  <
    const ResourceKeys extends ReadonlyArray<LayoutResourceKey<Resources>>,
    const Name extends string,
  >(
    options: {
      resources: ReadonlyArray<LayoutResourceKey<Resources>>;
      name: (resource: CapitalizedResource<ResourceKeys[number]>) => Name;
    } & { resources: ResourceKeys },
  ): ScopedCreateResourceLayoutFn<
    Resources,
    InProps,
    Composables,
    SharedResourceLayoutArguments<Resources, ResourceKeys, Name>,
    CustomProps
  >;

  /**
   * Creates a scoped layout factory from a resource-keyed configuration.
   * Only configured resources are available from the returned factory.
   *
   * @example
   * createResourceLayout.forResources({
   *   users: { name: resource => `${resource}Page` },
   *   admins: { name: 'AdminDirectory' },
   * })
   *
   * @param options Resource-keyed layout defaults.
   * @returns A layout factory scoped to the configured resources.
   */
  <
    const CallbackName extends string,
    const Selection extends ResourceLayoutSelection<Resources, CallbackName>,
  >(
    options: Selection &
      AtLeastOneResourceLayoutSelection<Resources, CallbackName> &
      Partial<
        Record<Exclude<'resources', LayoutResourceKey<Resources>>, never>
      > &
      Record<Exclude<keyof Selection, LayoutResourceKey<Resources>>, never>,
  ): ScopedCreateResourceLayoutFn<
    Resources,
    InProps,
    Composables,
    SelectedResourceLayoutArguments<Selection>,
    CustomProps
  >;
};
