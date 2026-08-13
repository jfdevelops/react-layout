import type { ComposableComponents } from '@jfdevelops/react-layout-composables';
import type {
  InPropsDefinition,
  InPropsObject,
  MergedLayoutInProps,
  ResolvedIncludedComponentProps,
} from '../props';
import type {
  LayoutResourceKey,
  ResourceDefinition,
} from '../resource';
import type { UnionToIntersection, Updater } from '../utils';
import { capitalize } from '../utils/capitalize';
import type {
  LayoutIncludeProps,
  LayoutPropsForResource,
  ResourceLayoutComponent,
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

export type CreateResourceLayoutOptionsBase<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Name extends string,
  Resource extends LayoutResourceKey<Resources>,
  Props extends InPropsObject = {},
> = {
  name: Name;
  resource: Resource;
  props?: Props;
};

export type CreateResourceLayoutOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables>,
  Name extends string,
  Resource extends LayoutResourceKey<Resources>,
  Props extends InPropsObject = {},
> = LayoutPropsForResource<Resources, InProps, Composables, IncludeProps> &
  CreateResourceLayoutOptionsBase<Resources, Name, Resource, Props>;

export type CreateLayoutForResourceOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Name extends string,
  Resource extends LayoutResourceKey<Resources>,
> = {
  name?: Name;
  resource: Resource;
};

type CreatedLayoutForResourceOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables>,
  Props extends InPropsObject = {},
  Defaults extends LayoutPropDefaults = {},
> = ResolveLayoutPropsWithDefaults<
  LayoutPropsForResource<Resources, InProps, Composables, IncludeProps>,
  Defaults
> & {
  props?: Props;
};

type CreatedLayoutForResourceCallOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables>,
  OverrideName extends string,
  Props extends InPropsObject,
  Defaults extends LayoutPropDefaults,
> = CreatedLayoutForResourceOptions<
  Resources,
  InProps,
  Composables,
  IncludeProps,
  Props,
  Defaults
> & {
  name?: OverrideName;
};

export type CreatedLayoutForResource<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables>,
  Name extends string,
  Resource extends LayoutResourceKey<Resources>,
  CustomProps extends InPropsObject = {},
  Defaults extends LayoutPropDefaults = {},
> = <OverrideName extends string = Name, Props extends InPropsObject = {}>(
  ...args: {} extends CreatedLayoutForResourceCallOptions<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    OverrideName,
    Props,
    Defaults
  >
    ? [options?: CreatedLayoutForResourceCallOptions<
        Resources,
        InProps,
        Composables,
        IncludeProps,
        OverrideName,
        Props,
        Defaults
      >]
    : [options: CreatedLayoutForResourceCallOptions<
        Resources,
        InProps,
        Composables,
        IncludeProps,
        OverrideName,
        Props,
        Defaults
      >]
) => ResourceLayoutComponent<
  OverrideName,
  CustomProps,
  Composables,
  Resource,
  ResolvedIncludedComponentProps<
    MergedLayoutInProps<Resources, InProps, Composables>,
    IncludeProps
  >
>;

type SetDefaultPropsForResource<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents = {},
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables> = {},
> = Partial<
  LayoutPropsForResource<Resources, InProps, Composables, IncludeProps>
>;

type ResolvedSetDefaultProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables>,
  Defaults extends SetDefaultPropsForResource<
    Resources,
    InProps,
    Composables,
    IncludeProps
  >,
> = {
  [Key in keyof Defaults &
    keyof LayoutPropsForResource<
      Resources,
      InProps,
      Composables,
      IncludeProps
    >]: LayoutPropsForResource<
      Resources,
      InProps,
      Composables,
      IncludeProps
    >[Key];
};

export type SetDefaultPropForResourceFn<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables>,
  Name extends string,
  Resource extends LayoutResourceKey<Resources>,
  CustomProps extends InPropsObject = {},
> = <
  const Defaults extends SetDefaultPropsForResource<
    Resources,
    InProps,
    Composables,
    IncludeProps
  >,
>(
  /** Default values for layout props. Each prop can only be set once. */
  defaults: Defaults,
) => CreatedLayoutForResource<
  Resources,
  InProps,
  Composables,
  IncludeProps,
  Name,
  Resource,
  CustomProps,
  ResolvedSetDefaultProps<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    Defaults
  >
>;

type CapitalizedResource<Resource extends string> =
  Resource extends Resource
    ? {
        toLowerCase: () => Lowercase<Capitalize<Resource>>;
      } & Capitalize<Resource>
    : never;

type ResourceLayoutNames<
  Resource extends string,
  CallbackName extends string,
> = {
  [TargetResource in Resource]?:
    | string
    | ((resource: CapitalizedResource<TargetResource>) => CallbackName);
};

type AtLeastOneResourceLayoutNameKey<Resource extends string> = {
  [TargetResource in Resource]: Record<TargetResource, unknown> &
    Partial<Record<Exclude<Resource, TargetResource>, unknown>>;
}[Resource];

type SelectedResourceLayoutNames<
  Resource extends string,
  SelectedResource extends Resource,
  CallbackName extends string,
> = {
  [TargetResource in Resource as TargetResource extends SelectedResource
    ? TargetResource
    : never]?:
    | string
    | ((resource: CapitalizedResource<TargetResource>) => CallbackName);
};

type NormalizeCapitalizedResourceName<
  Name extends string,
  Resource extends string,
> = Name extends Name
  ? NormalizeCapitalizedResourceNameMatch<
      Name,
      Resource
    > extends infer Match extends string
    ? [Match] extends [never]
      ? Name
      : Match
    : never
  : never;

type NormalizeCapitalizedResourceNameMatch<
  Name extends string,
  Resource extends string,
> = Resource extends Resource
  ? Name extends `${CapitalizedResource<Resource>}${infer Suffix}`
    ? `${Capitalize<Resource>}${Suffix}`
    : never
  : never;

type ResourceLayoutBuilder<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables>,
  Name extends string,
  Resource extends LayoutResourceKey<Resources>,
  CustomProps extends InPropsObject,
> = CreatedLayoutForResource<
  Resources,
  InProps,
  Composables,
  IncludeProps,
  Name,
  Resource,
  CustomProps
> & {
  /** Set default values for layout props in a single call. */
  setDefaults: SetDefaultPropForResourceFn<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    Name,
    Resource,
    CustomProps
  >;
};

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
    Partial<
      Record<
        Exclude<LayoutResourceKey<Resources>, Resource>,
        never
      >
    >;
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
> = Names extends Record<Resource, infer Name>
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
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables>,
  CustomProps extends InPropsObject,
  Resource extends LayoutResourceKey<Resources>,
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
  } & {
    name: Names & Record<Exclude<keyof Names, Resource>, never>;
  },
) => ResourceLayoutBuilder<
  Resources,
  InProps,
  Composables,
  IncludeProps,
  MappedResourceName<Names, CallbackName, Resource>,
  Resource,
  CustomProps
>;

type ResourceLayoutNameMapFns<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables>,
  CustomProps extends InPropsObject,
> = UnionToIntersection<
  {
    [Resource in LayoutResourceKey<Resources>]: ResourceLayoutNameMapFn<
      Resources,
      InProps,
      Composables,
      IncludeProps,
      CustomProps,
      Resource
    >;
  }[LayoutResourceKey<Resources>]
>;

export type CreateLayoutForResource<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents = {},
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables> = {},
  CustomProps extends InPropsObject = {},
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
    resource: Resource,
  ): ResourceLayoutBuilder<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    string,
    Resource,
    CustomProps
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
    },
  ): ResourceLayoutBuilder<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    NormalizeCapitalizedResourceName<Name, Resource>,
    Resource,
    CustomProps
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
    const Name extends string = string,
  >(
    options: CreateLayoutForResourceOptions<Resources, Name, Resource>,
  ): ResourceLayoutBuilder<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    Name,
    Resource,
    CustomProps
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
    options: Selection,
  ): ResourceLayoutBuilder<
    Resources,
    InProps,
    Composables,
    IncludeProps,
    SelectedResourceName<
      Selection,
      keyof Selection & LayoutResourceKey<Resources>
    >,
    keyof Selection & LayoutResourceKey<Resources>,
    CustomProps
  >;
} & ResourceLayoutNameMapFns<
  Resources,
  InProps,
  Composables,
  IncludeProps,
  CustomProps
>;

type CreateForResourceOptions = {
  createResourceLayout: (options: Record<string, unknown>) => unknown;
  resolveLayoutOptionDefaults: (
    defaults: Record<string, unknown>,
    options: Record<string, unknown>,
  ) => Record<string, unknown>;
};

export function createForResource<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  IncludeProps extends LayoutIncludeProps<Resources, InProps, Composables>,
  CustomProps extends InPropsObject,
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
      InProps,
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
    const setDefaults = ((defaults) =>
      createLayoutForResource(
        defaultName,
        resource,
        defaults,
      )) as SetDefaultPropForResourceFn<
      Resources,
      InProps,
      Composables,
      IncludeProps,
      Name,
      Resource,
      CustomProps
    >;

    return Object.assign(createLayout, { setDefaults });
  }

  const forResource = ((resourceOrOptions: unknown) => {
    type ResourceName =
      | string
      | ((resource: CapitalizedResource<LayoutResourceKey<Resources>>) => string);
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
      throw new Error('"resource" is required when calling "forResource"');
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
    InProps,
    Composables,
    IncludeProps,
    CustomProps
  >;

  return { createLayoutForResourceBuilder, forResource };
}
