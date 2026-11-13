import type { HostedSelection, UnhostedOnly } from './surface-host';
import type { CustomPropsObject } from '../custom-props';
import type { LayoutNameInput, ResolvedLayoutName } from './layout-name';
import type { ComposableComponents } from '@jfdevelops/react-layout-composables';
import type {
  InPropsDefinition,
  InPropsObject,
  MergedLayoutInProps,
  ResolvedIncludedComponentProps,
} from '../props';
import type { LayoutResourceKey, ResourceDefinition } from '../resource';
import type { UnionToIntersection, Updater } from '../utils';
import { LayoutConfigurationError } from '../errors';
import { capitalize } from '@jfdevelops/react-layout-internals';
import type {
  AtLeastOneResourceLayoutNameKey,
  CapitalizedResource,
  NormalizeCapitalizedResourceName,
  ResourceLayoutNames,
  SelectedResourceLayoutNames,
} from './for-resources/resource-selection';
import type {
  LayoutIncludeProps,
  LayoutPropsForResource,
  ResourceLayoutComponent,
  ResourceLayoutResult,
} from './define-layout';

type LayoutPropDefaults = Record<string, unknown>;

type CreateTimeLayoutPropWithDefault<
  LayoutProps extends LayoutPropDefaults,
  Key extends keyof LayoutProps,
> = LayoutProps[Key] extends (...args: unknown[]) => unknown
  ? LayoutProps[Key]
  : Updater<LayoutProps[Key]>;

type ResolveLayoutPropsWithDefaults<
  LayoutProps extends LayoutPropDefaults,
  Defaults extends LayoutPropDefaults,
> = Omit<LayoutProps, keyof Defaults> & {
  [Key in keyof Defaults & keyof LayoutProps]?: CreateTimeLayoutPropWithDefault<
    LayoutProps,
    Key
  >;
};

/**
 * The resource a created layout targets, with its optional name and extra
 * props. Shared by every `createResourceLayout` call shape.
 */
export interface ResourceLayoutTarget<Resource, Name = string, Props = {}> {
  /**
   * Overrides the definition or factory name; otherwise the resource supplies the name.
   */
  name?: Name;
  /**
   * The resource this layout renders.
   */
  resource: Resource;
  /**
   * Extra props declared for this layout only.
   */
  props?: Props;
}

export type CreateResourceLayoutOptionsBase<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Name extends string,
  Resource extends LayoutResourceKey<Resources>,
  Props extends InPropsObject = {},
  Naming extends LayoutNameInput<Resource, any, Name> | undefined =
    LayoutNameInput<Resource, string, Name>,
> = HostedSelection<Resources> & ResourceLayoutTarget<Resource, Naming, Props>;

export type CreateResourceLayoutOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables>,
  Name extends string,
  Resource extends LayoutResourceKey<Resources>,
  Props extends InPropsObject = {},
  Namespace extends boolean = false,
  Naming extends LayoutNameInput<Resource, any, Name> | undefined =
    LayoutNameInput<Resource, string, Name>,
> = LayoutPropsForResource<Resources, Options, Composables, IncludeProps> &
  CreateResourceLayoutOptionsBase<Resources, Name, Resource, Props, Naming> & {
    /**
     * Return a component namespace with `Root` instead of a callable component. Defaults to false.
     */
    namespace?: Namespace;
  };

export type CreateLayoutForResourceOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Name extends string,
  Resource extends LayoutResourceKey<Resources>,
> = HostedSelection<Resources> &
  Omit<ResourceLayoutTarget<Resource, Name>, 'props'>;

type CreatedLayoutForResourceOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables>,
  Props extends InPropsObject = {},
  Defaults extends LayoutPropDefaults = {},
> = ResolveLayoutPropsWithDefaults<
  LayoutPropsForResource<Resources, Options, Composables, IncludeProps>,
  Defaults
> & {
  props?: Props;
};

type CreatedLayoutForResourceCallOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables>,
  OverrideName extends string,
  Props extends InPropsObject,
  Defaults extends LayoutPropDefaults,
> = CreatedLayoutForResourceOptions<
  Resources,
  Options,
  Composables,
  IncludeProps,
  Props,
  Defaults
> & {
  name?: OverrideName;
};

export type CreatedLayoutForResource<
  in out Resources extends ReadonlyArray<ResourceDefinition>,
  in out Options extends InPropsDefinition<Resources>,
  in out Composables extends ComposableComponents,
  in out IncludeProps extends LayoutIncludeProps<
    Resources,
    Options,
    Composables
  >,
  out Name extends string,
  out Resource extends LayoutResourceKey<Resources>,
  in out CustomProps extends CustomPropsObject = {},
  in out Defaults extends LayoutPropDefaults = {},
  out DefaultNamespace extends boolean = false,
  in out States = {},
> = <
  OverrideName extends string = Name,
  Props extends InPropsObject = {},
  Namespace extends boolean = DefaultNamespace,
>(
  ...args: {} extends CreatedLayoutForResourceCallOptions<
    Resources,
    Options,
    Composables,
    IncludeProps,
    OverrideName,
    Props,
    Defaults
  > & { namespace?: Namespace }
    ? [
        options?: CreatedLayoutForResourceCallOptions<
          Resources,
          Options,
          Composables,
          IncludeProps,
          OverrideName,
          Props,
          Defaults
        > & { namespace?: Namespace },
      ]
    : [
        options: CreatedLayoutForResourceCallOptions<
          Resources,
          Options,
          Composables,
          IncludeProps,
          OverrideName,
          Props,
          Defaults
        > & { namespace?: Namespace },
      ]
) => ResourceLayoutResult<
  ResourceLayoutComponent<
    OverrideName,
    CustomProps,
    Composables,
    Resource,
    ResolvedIncludedComponentProps<
      MergedLayoutInProps<Resources, Options, Composables>,
      IncludeProps
    >,
    States,
    Resources,
    Options
  >,
  Namespace
>;

type SetDefaultPropsForResource<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents = {},
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables> = {},
> = Partial<
  LayoutPropsForResource<Resources, Options, Composables, IncludeProps>
>;

type ResolvedSetDefaultProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables>,
  Defaults extends SetDefaultPropsForResource<
    Resources,
    Options,
    Composables,
    IncludeProps
  >,
> = {
  [
    Key in keyof Defaults &
      keyof LayoutPropsForResource<
        Resources,
        Options,
        Composables,
        IncludeProps
      >
  ]: LayoutPropsForResource<Resources, Options, Composables, IncludeProps>[Key];
};

export type SetDefaultPropForResourceFn<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables>,
  Name extends string,
  Resource extends LayoutResourceKey<Resources>,
  CustomProps extends CustomPropsObject = {},
  DefaultNamespace extends boolean = false,
  States = {},
> = <
  const Defaults extends SetDefaultPropsForResource<
    Resources,
    Options,
    Composables,
    IncludeProps
  >,
>(
  /**
   * Default values for layout props. Each prop can only be set once.
   */
  defaults: Defaults,
) => CreatedLayoutForResource<
  Resources,
  Options,
  Composables,
  IncludeProps,
  Name,
  Resource,
  CustomProps,
  ResolvedSetDefaultProps<
    Resources,
    Options,
    Composables,
    IncludeProps,
    Defaults
  >,
  DefaultNamespace,
  States
>;

interface ResourceLayoutBuilder<
  in out Resources extends ReadonlyArray<ResourceDefinition>,
  in out Options extends InPropsDefinition<Resources>,
  in out Composables extends ComposableComponents,
  in out IncludeProps extends LayoutIncludeProps<
    Resources,
    Options,
    Composables
  >,
  out Name extends string,
  out Resource extends LayoutResourceKey<Resources>,
  in out CustomProps extends CustomPropsObject,
  out DefaultNamespace extends boolean = false,
  in out States = {},
> extends CreatedLayoutForResource<
  Resources,
  Options,
  Composables,
  IncludeProps,
  Name,
  Resource,
  CustomProps,
  {},
  DefaultNamespace,
  States
> {
  /**
   * Set default values for layout props in a single call.
   */
  setDefaults: SetDefaultPropForResourceFn<
    Resources,
    Options,
    Composables,
    IncludeProps,
    Name,
    Resource,
    CustomProps,
    DefaultNamespace,
    States
  >;
}

type SingleResourceLayoutSelection<
  Resources extends ReadonlyArray<ResourceDefinition>,
  CallbackName extends string,
> = {
  [Resource in LayoutResourceKey<Resources>]: Record<
    Resource,
    {
      name?:
        | string
        | ((resource: CapitalizedResource<Resource>) => CallbackName);
    }
  > &
    Partial<Record<Exclude<LayoutResourceKey<Resources>, Resource>, never>>;
}[LayoutResourceKey<Resources>];

type SelectedResourceName<Selection, Resource extends string> =
  Selection extends Record<Resource, { name?: infer Name }>
    ? Name extends (...args: never[]) => infer CallbackName
      ? NormalizeCapitalizedResourceName<CallbackName & string, Resource>
      : Name extends string
        ? Name
        : string
    : string;

type MappedResourceName<
  Names,
  CallbackName extends string,
  Resource extends string,
> =
  Names extends Record<Resource, infer Name>
    ? Name extends (...args: never[]) => unknown
      ? NormalizeCapitalizedResourceName<CallbackName, Resource>
      : Name & string
    : string;

/**
 * Creates a layout builder with a resource-keyed default-name map.
 *
 * @example
 * createResourceLayout.forResource({
 *   resource: 'users',
 *   name: {
 *     users: resource => `${resource}Page`,
 *   },
 * })
 *
 * @param options The resource and its resource-keyed default name.
 * @returns A layout builder bound to the selected resource.
 */
type ResourceLayoutNameMapFn<
  in out Resources extends ReadonlyArray<ResourceDefinition>,
  in out Options extends InPropsDefinition<Resources>,
  in out Composables extends ComposableComponents,
  in out IncludeProps extends LayoutIncludeProps<
    Resources,
    Options,
    Composables
  >,
  in out CustomProps extends CustomPropsObject,
  in out Resource extends LayoutResourceKey<Resources>,
  out DefaultNamespace extends boolean = false,
  in out States = {},
> = <const CallbackName extends string, const Names>(
  options: {
    resource: Resource;
    name: SelectedResourceLayoutNames<
      LayoutResourceKey<Resources>,
      Resource,
      CallbackName
    > &
      AtLeastOneResourceLayoutNameKey<Resource> &
      Record<
        string,
        NonNullable<
          ResourceLayoutNames<
            LayoutResourceKey<Resources>,
            CallbackName
          >[LayoutResourceKey<Resources>]
        >
      >;
  } & HostedSelection<Resources> & {
      name: Names & Record<Exclude<keyof Names, Resource>, never>;
    },
) => ResourceLayoutBuilder<
  Resources,
  Options,
  Composables,
  IncludeProps,
  MappedResourceName<Names, CallbackName, Resource>,
  Resource,
  CustomProps,
  DefaultNamespace,
  States
>;

type HostedResourceLayoutNameMapFn<
  in out Resources extends ReadonlyArray<ResourceDefinition>,
  in out Options extends InPropsDefinition<Resources>,
  in out Composables extends ComposableComponents,
  in out IncludeProps extends LayoutIncludeProps<
    Resources,
    Options,
    Composables
  >,
  in out CustomProps extends CustomPropsObject,
  out DefaultNamespace extends boolean = false,
  in out States = {},
> = <
  const Resource extends LayoutResourceKey<Resources>,
  const CallbackName extends string,
  const Names,
>(
  options: {
    resource: Resource;
    name: SelectedResourceLayoutNames<
      LayoutResourceKey<Resources>,
      Resource,
      CallbackName
    > &
      AtLeastOneResourceLayoutNameKey<Resource> &
      Record<
        string,
        NonNullable<
          ResourceLayoutNames<
            LayoutResourceKey<Resources>,
            CallbackName
          >[LayoutResourceKey<Resources>]
        >
      >;
  } & HostedSelection<Resources> & {
      name: Names & Record<Exclude<keyof Names, Resource>, never>;
    },
) => ResourceLayoutBuilder<
  Resources,
  Options,
  Composables,
  IncludeProps,
  MappedResourceName<Names, CallbackName, Resource>,
  Resource,
  CustomProps,
  DefaultNamespace,
  States
>;

type ResourceLayoutNameMapFns<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables>,
  CustomProps extends CustomPropsObject,
  DefaultNamespace extends boolean = false,
  States = {},
> = UnionToIntersection<
  {
    [Resource in LayoutResourceKey<Resources>]: ResourceLayoutNameMapFn<
      Resources,
      Options,
      Composables,
      IncludeProps,
      CustomProps,
      Resource,
      DefaultNamespace,
      States
    >;
  }[LayoutResourceKey<Resources>]
>;

export type CreateLayoutForResource<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents = {},
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables> = {},
  CustomProps extends CustomPropsObject = {},
  DefaultNamespace extends boolean = false,
  States = {},
  DefaultNaming extends LayoutNameInput<any, any> | undefined = undefined,
> = {
  /**
   * Creates a layout builder for one resource without a default name.
   *
   * @example
   * createResourceLayout.forResource('users')
   *
   * @param resource The resource to bind to the returned layout builder.
   * @returns A layout builder bound to the selected resource.
   */
  <const Resource extends LayoutResourceKey<Resources>>(
    resource: Resource & UnhostedOnly<Resources>,
  ): ResourceLayoutBuilder<
    Resources,
    Options,
    Composables,
    IncludeProps,
    ResolvedLayoutName<DefaultNaming, Resource>,
    Resource,
    CustomProps,
    DefaultNamespace,
    States
  >;

  /**
   * Creates a layout builder with a capitalized-resource naming callback.
   *
   * @example
   * createResourceLayout.forResource({
   *   resource: 'users',
   *   name: resource => `${resource}Page`,
   * })
   *
   * @param options The resource and its default-name callback.
   * @returns A layout builder bound to the selected resource.
   */
  <
    const Resource extends LayoutResourceKey<Resources>,
    const Name extends string,
  >(
    options: {
      name: (resource: CapitalizedResource<Resource>) => Name;
      resource: Resource;
    } & HostedSelection<Resources>,
  ): ResourceLayoutBuilder<
    Resources,
    Options,
    Composables,
    IncludeProps,
    NormalizeCapitalizedResourceName<Name, Resource>,
    Resource,
    CustomProps,
    DefaultNamespace,
    States
  >;

  /**
   * Creates a layout builder from the existing resource-options notation.
   *
   * @example
   * createResourceLayout.forResource({
   *   resource: 'users',
   *   name: 'UsersPage',
   * })
   *
   * @param options The resource and its optional default name.
   * @returns A layout builder bound to the selected resource.
   */
  <
    const Resource extends LayoutResourceKey<Resources>,
    const Name extends string = ResolvedLayoutName<DefaultNaming, Resource>,
  >(
    options: CreateLayoutForResourceOptions<Resources, Name, Resource>,
  ): ResourceLayoutBuilder<
    Resources,
    Options,
    Composables,
    IncludeProps,
    Name,
    Resource,
    CustomProps,
    DefaultNamespace,
    States
  >;

  /**
   * Creates a layout builder from a single resource-keyed configuration.
   *
   * @example
   * createResourceLayout.forResource({
   *   users: { name: resource => `${resource}Page` },
   * })
   *
   * @param options A single resource-keyed layout configuration.
   * @returns A layout builder bound to the configured resource.
   */
  <
    const CallbackName extends string,
    const Selection extends SingleResourceLayoutSelection<
      Resources,
      CallbackName
    >,
  >(
    options: Selection & UnhostedOnly<Resources>,
  ): ResourceLayoutBuilder<
    Resources,
    Options,
    Composables,
    IncludeProps,
    SelectedResourceName<
      Selection,
      keyof Selection & LayoutResourceKey<Resources>
    >,
    keyof Selection & LayoutResourceKey<Resources>,
    CustomProps,
    DefaultNamespace,
    States
  >;
} & (UnhostedOnly<Resources> extends never
  ? HostedResourceLayoutNameMapFn<
      Resources,
      Options,
      Composables,
      IncludeProps,
      CustomProps,
      DefaultNamespace,
      States
    >
  : ResourceLayoutNameMapFns<
      Resources,
      Options,
      Composables,
      IncludeProps,
      CustomProps,
      DefaultNamespace,
      States
    >);

type CreateForResourceOptions = {
  createResourceLayout: (options: Record<string, unknown>) => unknown;
  resolveLayoutOptionDefaults: (
    defaults: Record<string, unknown>,
    options: Record<string, unknown>,
  ) => Record<string, unknown>;
};

export function createForResource<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables>,
  CustomProps extends CustomPropsObject,
>({
  createResourceLayout,
  resolveLayoutOptionDefaults,
}: CreateForResourceOptions) {
  function createLayoutForResource<
    Name extends string,
    Resource extends LayoutResourceKey<Resources>,
    Defaults extends LayoutPropDefaults,
  >(
    defaultName: Name | undefined,
    resource: Resource,
    defaults: Record<string, unknown>,
  ) {
    return ((
      layoutOptions: { name?: string } & Record<string, unknown> = {},
    ) => {
      const { name, ...options } = layoutOptions;

      return createResourceLayout({
        ...defaults,
        name: name ?? defaultName,
        resource,
        ...resolveLayoutOptionDefaults(defaults, options),
      });
    }) as CreatedLayoutForResource<
      Resources,
      Options,
      Composables,
      IncludeProps,
      Name,
      Resource,
      CustomProps,
      Defaults
    >;
  }

  function createLayoutForResourceBuilder<
    Name extends string,
    Resource extends LayoutResourceKey<Resources>,
  >(defaultName: Name | undefined, resource: Resource) {
    const createLayout = createLayoutForResource(defaultName, resource, {});
    const setDefaults = ((defaults: never) =>
      createLayoutForResource(
        defaultName,
        resource,
        defaults,
      )) as unknown as SetDefaultPropForResourceFn<
      Resources,
      Options,
      Composables,
      IncludeProps,
      Name,
      Resource,
      CustomProps
    >;

    return Object.assign(createLayout, {
      setDefaults,
    });
  }

  const forResource = ((resourceOrOptions: unknown) => {
    type ResourceName =
      | string
      | ((
          resource: CapitalizedResource<LayoutResourceKey<Resources>>,
        ) => string);
    let name:
      | ResourceName
      | Partial<Record<LayoutResourceKey<Resources>, ResourceName>>
      | undefined;
    let resource: LayoutResourceKey<Resources> | undefined;

    if (typeof resourceOrOptions === 'string') {
      resource = resourceOrOptions as LayoutResourceKey<Resources>;
    } else if (
      resourceOrOptions !== null &&
      typeof resourceOrOptions === 'object' &&
      ('resource' in resourceOrOptions || 'name' in resourceOrOptions)
    ) {
      ({ name, resource } = resourceOrOptions as {
        name?: typeof name;
        resource?: LayoutResourceKey<Resources>;
      });
    } else {
      const [selection] = Object.entries(resourceOrOptions ?? {});

      if (selection) {
        const [selectedResource, options] = selection;
        resource = selectedResource as LayoutResourceKey<Resources>;
        name = (options as { name?: typeof name }).name;
      }
    }

    if (!resource) {
      throw new LayoutConfigurationError(
        '"resource" is required when calling "forResource"',
      );
    }

    const selectedName =
      name !== null && typeof name === 'object' ? name[resource] : name;
    let defaultName: string | undefined;

    if (typeof selectedName === 'function') {
      defaultName = selectedName(
        capitalize(resource) as CapitalizedResource<
          LayoutResourceKey<Resources>
        >,
      );
    } else if (typeof selectedName === 'string') {
      defaultName = selectedName;
    }

    return createLayoutForResourceBuilder(defaultName, resource);
  }) as CreateLayoutForResource<
    Resources,
    Options,
    Composables,
    IncludeProps,
    CustomProps
  >;

  return {
    createLayoutForResourceBuilder,
    forResource,
  };
}
