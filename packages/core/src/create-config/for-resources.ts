import {
  createContext,
  createElement,
  isValidElement,
  type ComponentType,
  type JSX,
  type ReactNode,
  useContext,
} from 'react';
import type {
  ComposableComponents,
  ComposableResourceLayout,
} from '@jfdevelops/react-layout-composables';
import {
  type AnyBuiltPropDefinition,
  type ResolveProps,
  type ResolvedBuiltPropShape,
  validateProps,
} from '@jfdevelops/react-layout-validator';
import type {
  IncludedProps,
  InPropsDefinition,
  InPropsObject,
  MergedLayoutInProps,
  ResolvedIncludedPropsAsDefined,
} from '../props';
import type { LayoutResourceKey, ResourceDefinition } from '../resource';
import { capitalize } from '../utils/capitalize';
import type { BaseComponent, Show } from '../utils';
import type {
  LayoutIncludeProps,
  LayoutPropsForResource,
  ResourceLayoutComponent,
} from './define-layout';
import type {
  CreatedLayoutForResource,
  CreateLayoutForResourceOptions,
  CreateResourceLayoutOptionsBase,
  SetDefaultPropForResourceFn,
} from './for-resource';

type CapitalizedResource<Resource extends string> = Resource extends Resource
  ? {
      toLowerCase: () => Lowercase<Capitalize<Resource>>;
    } & Capitalize<Resource>
  : never;

type ResourceLayoutName<
  Resource extends string,
  Name extends string = string,
> = Name | ((resource: CapitalizedResource<Resource>) => Name);

type ResourceLayoutNames<
  Resource extends string,
  CallbackName extends string = string,
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

type ResourcesLayoutName<Resource extends string> =
  | Exclude<ResourceLayoutName<Resource>, string>
  | ResourceLayoutNames<Resource>;

type ResourceLayoutSelection<
  Resources extends ReadonlyArray<ResourceDefinition>,
  CallbackName extends string = string,
> = {
  [Resource in LayoutResourceKey<Resources>]?: {
    name?: string | ((resource: CapitalizedResource<Resource>) => CallbackName);
  };
};

type AtLeastOneResourceLayoutSelection<
  Resources extends ReadonlyArray<ResourceDefinition>,
  CallbackName extends string,
> = {
  [Resource in LayoutResourceKey<Resources>]: Required<
    Pick<ResourceLayoutSelection<Resources, CallbackName>, Resource>
  > &
    Omit<ResourceLayoutSelection<Resources, CallbackName>, Resource>;
}[LayoutResourceKey<Resources>];

type SelectedLayoutResources<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Arguments extends ReadonlyArray<unknown>,
> =
  Arguments extends ReadonlyArray<LayoutResourceKey<Resources>>
    ? Arguments[number]
    : Arguments[0] extends {
          resources: ReadonlyArray<infer Resource>;
        }
      ? Resource & LayoutResourceKey<Resources>
      : keyof Arguments[0] & LayoutResourceKey<Resources>;

type ResolveResourceLayoutName<Name> = Name extends (
  ...args: never[]
) => infer Result
  ? Result & string
  : Name extends string
    ? Name
    : string;

type NormalizeCapitalizedResourceName<
  Name extends string,
  Resource extends string,
> = Name extends Name
  ? NormalizeCapitalizedResourceNameMatch<Name, Resource> extends infer Match
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

type SelectedResourceLayoutName<Arguments, Resource extends string> =
  Arguments extends ReadonlyArray<string>
    ? string
    : Arguments extends readonly [infer Options]
      ? Options extends {
          resources: ReadonlyArray<string>;
          name?: infer Name;
        }
        ? Name extends (...args: never[]) => unknown
          ? ResolveResourceLayoutName<Name>
          : Name extends Record<Resource, infer ResourceName>
            ? ResolveResourceLayoutName<ResourceName>
            : string
        : Options extends Record<Resource, infer ResourceOptions>
          ? ResourceOptions extends { name?: infer Name }
            ? ResolveResourceLayoutName<Name>
            : string
          : string
      : string;

type NormalizeResourceLayoutNames<Names, CallbackName extends string> = {
  [Resource in keyof Names]: Names[Resource] extends (
    ...args: never[]
  ) => unknown
    ? (
        resource: CapitalizedResource<Resource & string>,
      ) => NormalizeCapitalizedResourceName<CallbackName, Resource & string>
    : Names[Resource];
};

type NormalizeResourceLayoutSelection<Selection> = {
  [Resource in keyof Selection]: Selection[Resource] extends {
    name: infer Name;
  }
    ? {
        name: Name extends (...args: never[]) => unknown
          ? (
              resource: CapitalizedResource<Resource & string>,
            ) => NormalizeCapitalizedResourceName<
              ResolveResourceLayoutName<Name>,
              Resource & string
            >
          : Name;
      }
    : Selection[Resource];
};

type SharedResourceLayoutArguments<
  Resources extends ReadonlyArray<ResourceDefinition>,
  ResourceKeys extends ReadonlyArray<LayoutResourceKey<Resources>>,
  Name extends string,
> = readonly [
  {
    resources: ResourceKeys;
    name: (
      resource: CapitalizedResource<ResourceKeys[number]>,
    ) => NormalizeCapitalizedResourceName<Name, ResourceKeys[number]>;
  },
];

type MappedResourceLayoutArguments<
  Resources extends ReadonlyArray<ResourceDefinition>,
  ResourceKeys extends ReadonlyArray<LayoutResourceKey<Resources>>,
  Names,
  CallbackName extends string,
> = readonly [
  {
    resources: ResourceKeys;
    name: NormalizeResourceLayoutNames<Names, CallbackName>;
  },
];

type SelectedResourceLayoutArguments<Selection> = readonly [
  NormalizeResourceLayoutSelection<Selection>,
];

type HasResourceLayoutName<Arguments, Resource extends string> =
  Arguments extends ReadonlyArray<string>
    ? false
    : Arguments extends readonly [infer Options]
      ? Options extends {
          resources: ReadonlyArray<string>;
          name: infer Name;
        }
        ? Name extends (...args: never[]) => unknown
          ? true
          : Name extends Record<Resource, unknown>
            ? true
            : false
        : Options extends Record<Resource, infer ResourceOptions>
          ? 'name' extends keyof ResourceOptions
            ? true
            : false
          : false
      : false;

type ScopedCreateResourceLayoutOptions<
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

type ScopedCreateResourceLayoutFnImpl<
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

type ScopedCreateLayoutForResource<
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

type ScopedCreateResourceLayoutMakeComposableFn<
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

type ScopedComponentAvailableProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  LayoutCustomProps extends InPropsObject,
> = MergedLayoutInProps<Resources, InProps, Composables> & LayoutCustomProps;

type ScopedResourceComponentProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  LayoutCustomProps extends InPropsObject,
  ComponentIncludeProps extends IncludedProps<
    ScopedComponentAvailableProps<
      Resources,
      InProps,
      Composables,
      LayoutCustomProps
    >
  >,
  ComponentCustomProps extends InPropsObject,
  Resource extends string,
> = Show<
  Omit<
    ResolvedIncludedPropsAsDefined<
      ScopedComponentAvailableProps<
        Resources,
        InProps,
        Composables,
        LayoutCustomProps
      >,
      ComponentIncludeProps
    > &
      ResolvedBuiltPropShape<ComponentCustomProps>,
    'children' | 'resource'
  > & {
    children?: ReactNode;
    resource: Resource;
  }
>;

/**
 * Call-site props for a createComponent result: declared include/custom props
 * plus props of any component type returned from the top-level `render`.
 *
 * Mirrors scoped-component inference (`PropsFromScopedRender`), but for the
 * outer component: `<Directory requiredProp="x" />` must type-check when
 * `render` returns a component that requires `requiredProp`.
 *
 * These extras are applied only to the *external* call signature — not to the
 * `render` `props` parameter — so inference stays non-circular (return type
 * cannot depend on a props type that already includes that return).
 *
 * `children` / `resource` stay owned by the wrapper (not taken from the return).
 */
type ScopedResourceComponentCallProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  LayoutCustomProps extends InPropsObject,
  ComponentIncludeProps extends IncludedProps<
    ScopedComponentAvailableProps<
      Resources,
      InProps,
      Composables,
      LayoutCustomProps
    >
  >,
  ComponentCustomProps extends InPropsObject,
  Resource extends string,
  RenderResult = never,
> = Show<
  ScopedResourceComponentProps<
    Resources,
    InProps,
    Composables,
    LayoutCustomProps,
    ComponentIncludeProps,
    ComponentCustomProps,
    Resource
  > &
    Omit<PropsFromRenderResult<RenderResult>, 'children' | 'resource'>
>;

/**
 * Fields reverse-inferred from each scoped component declaration.
 *
 * `props` reverse-maps as-is. `render` cannot reverse-map as a full function
 * type (that becomes `unknown`), so only its return type is preserved via
 * `(...args: any) => Return`. Call-site props and compound statics are then
 * read from that return type on the inferred generic.
 */
type ScopedComponentShape = {
  props?: InPropsObject;
  render?: (...args: never[]) => unknown;
};

/**
 * Homomorphic pick of reverse-mapped scoped-component fields. Paired with a
 * mapped type over the components object, this lets each entry's inferred
 * `props` and `render` return type flow into sibling / context signatures.
 */
type JustScopedComponent<T> = {
  [Key in keyof T & keyof ScopedComponentShape]: Key extends 'render'
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any -- open args; preserve Return only
      T[Key] extends (...args: any) => infer Return
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any -- open args
        (...args: any) => Return
      : unknown
    : T[Key];
};

/**
 * Resources with no `components` reverse-infer as `unknown`. Treat that as an
 * empty map so sibling/context access stays closed.
 */
type NormalizeScopedComponentsMap<Components> = unknown extends Components
  ? {}
  : Components extends Record<string, unknown>
    ? Components
    : {};

/** Extracts the prop definitions declared on a scoped component. */
type ScopedComponentOwnProps<Definition> = Definition extends {
  props: infer Props;
}
  ? Props extends InPropsObject
    ? Props
    : {}
  : {};

/**
 * True when a scoped `render` returned a component type (callable), not a
 * React node like `null` / an element.
 */
type IsScopedRenderableComponentType<Result> = [Result] extends [never]
  ? false
  : [Result] extends [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- open args
        (...args: any) => any,
      ]
    ? true
    : [Result] extends [ComponentType<any>]
      ? true
      : false;

/**
 * Props of a component type returned from a scoped `render`. Empty when the
 * render returns a node (or a component with no props).
 */
type PropsFromRenderResult<Result> = [Result] extends [never]
  ? {}
  : IsScopedRenderableComponentType<Result> extends true
    ? Result extends (props: infer Props) => any
      ? unknown extends Props
        ? {}
        : Props extends object
          ? Props
          : {}
      : [Result] extends [ComponentType<infer Props>]
        ? Props
        : {}
    : {};

/** Call-site props inferred from a scoped component's `render` return type. */
type PropsFromScopedRender<Definition> = Definition extends {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- open args
  render: (...args: any) => infer Result;
}
  ? PropsFromRenderResult<Result>
  : {};

/**
 * Call-site props for a scoped component: declared `props` plus props of any
 * component type returned from `render`.
 */
type ScopedComponentCallProps<Definition> = Show<
  ResolvedBuiltPropShape<ScopedComponentOwnProps<Definition>> &
    PropsFromScopedRender<Definition>
>;

/**
 * A scoped component's call signature. Components that declare no props are
 * callable with no arguments.
 */
type ScopedComponentSignature<Props> = {} extends Props
  ? (props?: Props) => JSX.Element
  : (props: Props) => JSX.Element;

/**
 * Function-prototype / React statics that must not appear as compound
 * component keys on a scoped component resolved from a returned component type.
 */
type ScopedComponentCompoundStaticKey =
  | 'apply'
  | 'arguments'
  | 'bind'
  | 'call'
  | 'caller'
  | 'childContextTypes'
  | 'contextTypes'
  | 'defaultProps'
  | 'displayName'
  | 'length'
  | 'name'
  | 'propTypes'
  | 'prototype'
  | 'toLocaleString'
  | 'toString'
  | 'valueOf'
  | '$$typeof';

/**
 * Compound statics (e.g. `DataTable.Loading`) taken from a component type
 * returned by scoped `render`.
 *
 * Types alone are not enough: the runtime wrapper must expose the same keys
 * (see `withScopedCompoundStatics`), otherwise `components.DataTable.Loading`
 * type-checks but throws at runtime.
 */
type ScopedComponentCompoundStatics<Result> = [Result] extends [never]
  ? {}
  : IsScopedRenderableComponentType<Result> extends true
    ? {
        [Key in keyof Result as Key extends ScopedComponentCompoundStaticKey
          ? never
          : // eslint-disable-next-line @typescript-eslint/no-explicit-any -- open args
            Result[Key] extends (...args: any) => any
            ? Key & string
            : never]: Result[Key] extends (props: infer Props) => any
          ? ScopedComponentSignature<Props extends object ? Props : {}>
          : never;
      }
    : {};

/**
 * A resolved scoped component: call signature from declared + returned-component
 * props, plus any compound statics on the returned component type.
 */
type ResolvedScopedComponent<Definition> = ScopedComponentSignature<
  ScopedComponentCallProps<Definition>
> &
  ScopedComponentCompoundStatics<
    Definition extends {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- open args
      render: (...args: any) => infer Result;
    }
      ? Result
      : never
  >;

/**
 * The sibling / context components for one resource, keyed by their declared
 * names with call-site prop types (and compound statics when applicable).
 */
type ResolvedScopedComponentsMap<Components> = {
  [Name in keyof NormalizeScopedComponentsMap<Components>]: ResolvedScopedComponent<
    NormalizeScopedComponentsMap<Components>[Name]
  >;
};

type ScopedResourceComponentRenderContext<
  ComponentsByResource,
  LayoutCustomProps extends InPropsObject,
> = {
  /**
   * The resource layout for the component's current `resource`, created
   * internally from that resource's entry options. Accepts the layout's
   * custom props.
   */
  Root: (props: Show<ResolveProps<LayoutCustomProps>>) => JSX.Element;
} & {
  [Resource in keyof ComponentsByResource as Capitalize<
    Resource & string
  >]-?: (() => JSX.Element) &
    ResolvedScopedComponentsMap<ComponentsByResource[Resource]>;
};

/**
 * Reverse-mapped `resources` constraint.
 *
 * `ComponentsByResource` is inferred from each entry's `components` object.
 * Mapping back over those keys types every nested `render`'s second argument
 * with the other components for that resource — excluding the current
 * component when typing a scoped component's own `render`.
 *
 * The parameter must not carry a default: TypeScript contextually types from a
 * parameter's default when it has one, and `{}` would silently degrade every
 * nested render to `any`.
 */
type ScopedComponentResourceEntries<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  LayoutCustomProps extends InPropsObject,
  ComponentIncludeProps extends IncludedProps<
    ScopedComponentAvailableProps<
      Resources,
      InProps,
      Composables,
      LayoutCustomProps
    >
  >,
  ComponentCustomProps extends InPropsObject,
  ComponentsByResource,
> = {
  [Resource in keyof ComponentsByResource]: LayoutPropsForResource<
    Resources,
    InProps,
    Composables
  > & {
    /**
     * Overrides the layout name used by `context.Root` for this resource.
     * Defaults to the scope's configured name, then the capitalized resource.
     */
    name?: string;
    /**
     * Components scoped to this resource. Each becomes a component on this
     * resource's render context, on `context.<Resource>`, and on the component
     * returned by `asHOF()`.
     */
    components?: {
      [Name in keyof ComponentsByResource[Resource]]: JustScopedComponent<
        ComponentsByResource[Resource][Name]
      > & {
        /** Props accepted by this component, validated at its call site. */
        props?: InPropsObject;
        /**
         * Renders this component. Receives the scoped component's props plus
         * this component's own props, and the other components for this
         * resource (excluding itself).
         *
         * May return a React node or a component type (mounted with the
         * call-site props). Props and compound statics of a returned component
         * type are inferred at call sites from the render return type.
         */
        render: (
          props: ScopedResourceComponentProps<
            Resources,
            InProps,
            Composables,
            LayoutCustomProps,
            ComponentIncludeProps,
            ComponentCustomProps,
            Resource & string
          > &
            Show<
              ResolvedBuiltPropShape<
                ScopedComponentOwnProps<ComponentsByResource[Resource][Name]>
              >
            >,
          components: Omit<
            ResolvedScopedComponentsMap<ComponentsByResource[Resource]>,
            Name
          >,
        ) => ScopedRenderResult;
      };
    };
    /** Renders this resource's content inside the shared render function. */
    render: (
      props: ScopedResourceComponentProps<
        Resources,
        InProps,
        Composables,
        LayoutCustomProps,
        ComponentIncludeProps,
        ComponentCustomProps,
        Resource & string
      >,
      components: ResolvedScopedComponentsMap<ComponentsByResource[Resource]>,
    ) => ScopedRenderResult;
  };
} & Record<
  Exclude<
    keyof ComponentsByResource,
    SelectedLayoutResources<Resources, Arguments>
  >,
  never
>;

/**
 * Props of a resource-bound component. `resource` is supplied by the binding,
 * so it is removed from the call site.
 */
type ScopedBoundResourceComponentProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  LayoutCustomProps extends InPropsObject,
  ComponentIncludeProps extends IncludedProps<
    ScopedComponentAvailableProps<
      Resources,
      InProps,
      Composables,
      LayoutCustomProps
    >
  >,
  ComponentCustomProps extends InPropsObject,
  Resource extends string,
  RenderResult = never,
> = Show<
  Omit<
    ScopedResourceComponentCallProps<
      Resources,
      InProps,
      Composables,
      LayoutCustomProps,
      ComponentIncludeProps,
      ComponentCustomProps,
      Resource,
      RenderResult
    >,
    'resource'
  >
>;

type ScopedBoundResourceComponent<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  LayoutCustomProps extends InPropsObject,
  ComponentIncludeProps extends IncludedProps<
    ScopedComponentAvailableProps<
      Resources,
      InProps,
      Composables,
      LayoutCustomProps
    >
  >,
  ComponentCustomProps extends InPropsObject,
  ComponentsByResource,
  Resource extends string,
  RenderResult = never,
> = BaseComponent<
  string,
  ScopedBoundResourceComponentProps<
    Resources,
    InProps,
    Composables,
    LayoutCustomProps,
    ComponentIncludeProps,
    ComponentCustomProps,
    Resource,
    RenderResult
  >
> &
  ResolvedScopedComponentsMap<
    Resource extends keyof ComponentsByResource
      ? ComponentsByResource[Resource]
      : {}
  > & {
    (
      props: ScopedBoundResourceComponentProps<
        Resources,
        InProps,
        Composables,
        LayoutCustomProps,
        ComponentIncludeProps,
        ComponentCustomProps,
        Resource,
        RenderResult
      >,
    ): JSX.Element;
    /**
     * Type-only property containing the bound resource. This property is
     * `undefined` at runtime.
     */
    readonly resource: Resource;
  };

type ScopedResourceComponent<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  LayoutCustomProps extends InPropsObject,
  ComponentIncludeProps extends IncludedProps<
    ScopedComponentAvailableProps<
      Resources,
      InProps,
      Composables,
      LayoutCustomProps
    >
  >,
  ComponentCustomProps extends InPropsObject,
  ComponentsByResource,
  RenderResult = never,
> = BaseComponent<
  string,
  ScopedResourceComponentCallProps<
    Resources,
    InProps,
    Composables,
    LayoutCustomProps,
    ComponentIncludeProps,
    ComponentCustomProps,
    SelectedLayoutResources<Resources, Arguments>,
    RenderResult
  >
> & {
  /**
   * The `resource` prop drives the generic, so it is inferred from the call
   * site. Explicit type arguments are never needed.
   */
  <const Resource extends SelectedLayoutResources<Resources, Arguments>>(
    props: ScopedResourceComponentCallProps<
      Resources,
      InProps,
      Composables,
      LayoutCustomProps,
      ComponentIncludeProps,
      ComponentCustomProps,
      Resource,
      RenderResult
    >,
  ): JSX.Element;
  /**
   * Returns a factory that binds the component to one resource. The bound
   * component accepts every prop except `resource`, which the binding supplies.
   *
   * Each resource is bound once and cached, so the returned component type is
   * stable across renders.
   *
   * @example
   * const createDirectory = Directory.asHOF()
   * const UsersDirectory = createDirectory('users')
   *
   * <UsersDirectory title='Users' />
   *
   * @returns A factory producing a component bound to the given resource.
   */
  asHOF(): <
    const Resource extends SelectedLayoutResources<Resources, Arguments>,
  >(
    resource: Resource,
  ) => ScopedBoundResourceComponent<
    Resources,
    InProps,
    Composables,
    LayoutCustomProps,
    ComponentIncludeProps,
    ComponentCustomProps,
    ComponentsByResource,
    Resource,
    RenderResult
  >;
};

type ScopedCreateComponent<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  LayoutCustomProps extends InPropsObject,
> = <
  // Declared first and deliberately without a default: TypeScript
  // contextually types from a parameter's default when one exists, so a
  // default here would type every nested render as `any`. Inferred via a
  // reverse mapped type from each entry's `components` object.
  const ComponentsByResource,
  // Captures the top-level `render` return type so call-site props (and only
  // call-site props — not the render `props` parameter) can include props of a
  // returned component type. Without this, `<Directory requiredProp />` is an
  // excess-prop error even when the mounted return type requires it.
  // No default: a default would contextually type the render return and erase
  // the concrete component type (losing prop inference).
  const RenderResult extends ScopedRenderResult,
  const ComponentIncludeProps extends IncludedProps<
    ScopedComponentAvailableProps<
      Resources,
      InProps,
      Composables,
      LayoutCustomProps
    >
  > = {},
  ComponentCustomProps extends InPropsObject = {},
>(options: {
  props?: {
    /** Props from the resource layout definition to expose to the component. */
    include?: ComponentIncludeProps;
    /** Additional props accepted by the component. */
    custom?: ComponentCustomProps;
  };
  /**
   * Per-resource content, keyed by resource. Each entry holds that resource's
   * create-time layout options, its scoped `components`, and its `render`.
   */
  resources?: ScopedComponentResourceEntries<
    Resources,
    InProps,
    Composables,
    Arguments,
    LayoutCustomProps,
    ComponentIncludeProps,
    ComponentCustomProps,
    ComponentsByResource
  >;
  /**
   * Renders the scoped component. `children` and `resource` are always
   * available. The context contains `Root`, the layout for the current
   * resource, plus a capitalized component per defined resource.
   *
   * May return a React node or a component type (mounted with the component
   * props). When a component type is returned, its props are merged into the
   * created component's call signature via `RenderResult` /
   * `ScopedResourceComponentCallProps` — they are intentionally *not* added
   * to this `props` parameter (that would circularly depend on the return).
   */
  render: (
    props: ScopedResourceComponentProps<
      Resources,
      InProps,
      Composables,
      LayoutCustomProps,
      ComponentIncludeProps,
      ComponentCustomProps,
      SelectedLayoutResources<Resources, Arguments>
    >,
    context: ScopedResourceComponentRenderContext<
      ComponentsByResource,
      LayoutCustomProps
    >,
  ) => RenderResult;
}) => ScopedResourceComponent<
  Resources,
  InProps,
  Composables,
  Arguments,
  LayoutCustomProps,
  ComponentIncludeProps,
  ComponentCustomProps,
  ComponentsByResource,
  RenderResult
>;

type ScopedCreateResourceLayoutFn<
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
   * Each key of `resources` holds that resource's create-time layout options
   * alongside its `render`. The render context exposes `Root` — the layout for
   * the current resource, built from those options — and one capitalized
   * component per key present in `resources`.
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
   *       title: 'Users',
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
   *       title: 'Admins',
   *       render: ({ resource }) => <span>{resource}</span>,
   *     },
   *   },
   *   render: ({ actions, children, resource }, context) => (
   *     <context.Root actions={actions}>
   *       {children}
   *       {resource === 'users' ? <context.Users /> : <context.Admins />}
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

/**
 * Names a scoped component cannot use. Scoped components are attached to
 * function objects, so they collide with the component's own statics and with
 * non-writable `Function.prototype` properties. `__proto__` is reserved so
 * assignment cannot hit the prototype setter on a normal object.
 */
const reservedScopedComponentNames = new Set([
  '__proto__',
  'apply',
  'arguments',
  'bind',
  'call',
  'caller',
  'displayName',
  'length',
  'name',
  'props',
  'prototype',
  'resource',
]);

/**
 * Values a createComponent / scoped-component `render` may return.
 *
 * Alongside rendered nodes, a component type is allowed — the type constituent
 * of a React element — so factories like `createDataTable(columns)` can be
 * returned directly and mounted with the call-site props.
 *
 * At runtime, `resolveScopedRenderResult` distinguishes component types from
 * nodes (including portals). Getting that wrong mounts a portal via
 * `createElement` and blows up with an invalid-element-type error.
 */
// Returned components declare their own props; a concrete props parameter would
// be contravariant and reject the factories callers actually return.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
type ScopedRenderResult = ReactNode | ComponentType<any>;

/**
 * `$$typeof` tags for object component wrappers that `createElement` accepts
 * as `type` (forwardRef, memo, lazy).
 *
 * Do not treat "any object with `$$typeof`" as a component: portals also have
 * `$$typeof` (`Symbol.for('react.portal')`) and `isValidElement(portal)` is
 * false, so a naive check would mis-classify them.
 */
const reactForwardRefType = Symbol.for('react.forward_ref');
const reactMemoType = Symbol.for('react.memo');
const reactLazyType = Symbol.for('react.lazy');

/**
 * True when `value` can be passed as the `type` argument to `createElement`.
 *
 * Functions always qualify. Object wrappers qualify only for the forwardRef /
 * memo / lazy tags above — not portals or other React nodes that happen to
 * carry `$$typeof`.
 */
function isRenderableComponentType(
  value: unknown,
): value is ComponentType<Record<string, unknown>> {
  if (typeof value === 'function') {
    return true;
  }

  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    isValidElement(value) ||
    !('$$typeof' in value)
  ) {
    return false;
  }

  const typeTag = (value as { $$typeof: unknown }).$$typeof;

  return (
    typeTag === reactForwardRefType ||
    typeTag === reactMemoType ||
    typeTag === reactLazyType
  );
}

/**
 * If `render` returned a component type, mount it with `props`; otherwise
 * return the node as-is (elements, portals, null, etc.).
 */
function resolveScopedRenderResult(
  result: ScopedRenderResult,
  props: Record<string, unknown> = {},
): JSX.Element {
  if (isRenderableComponentType(result)) {
    return createElement(result, props);
  }

  return result as JSX.Element;
}

/**
 * Runtime counterpart of `ScopedComponentCompoundStaticKey` — keys that must
 * not be treated as compound component statics on a scoped wrapper.
 */
const reservedScopedCompoundStaticKeys = new Set<PropertyKey>([
  'apply',
  'arguments',
  'bind',
  'call',
  'caller',
  'childContextTypes',
  'contextTypes',
  'defaultProps',
  'displayName',
  'length',
  'name',
  'propTypes',
  'prototype',
  'toLocaleString',
  'toString',
  'valueOf',
  '$$typeof',
]);

type ScopedComponentWrapper = ((
  props?: Record<string, unknown>,
) => JSX.Element) &
  Record<string, unknown>;

/**
 * Exposes compound statics (e.g. `DataTable.Loading`) on a scoped wrapper so
 * runtime matches `ScopedComponentCompoundStatics`.
 *
 * Why a Proxy: JSX reads `components.DataTable.Loading` while building the
 * element tree — before `DataTable` itself renders — so statics cannot be
 * copied only after the first `render` call. Property access lazily creates a
 * stable wrapper component that re-runs the scoped `render` under context and
 * mounts the matching static from the returned component type.
 */
function withScopedCompoundStatics(
  wrapper: (props?: Record<string, unknown>) => JSX.Element,
  createCompoundStatic: (
    staticName: string,
  ) => (ownProps?: Record<string, unknown>) => JSX.Element,
): ScopedComponentWrapper {
  return new Proxy(wrapper as ScopedComponentWrapper, {
    get(target, property, receiver) {
      if (
        typeof property === 'symbol' ||
        reservedScopedCompoundStaticKeys.has(property) ||
        property in target
      ) {
        return Reflect.get(target, property, receiver);
      }

      // Cache on the target so repeated `.Loading` access keeps one identity.
      const CompoundStatic = createCompoundStatic(property);
      target[property] = CompoundStatic;
      return CompoundStatic;
    },
  });
}

type CreateForResourcesOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = {
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
      render: ScopedComponentRenderFn;
    };

    type ScopedComponentEntry = {
      [option: string]: unknown;
      name?: string;
      components?: Record<string, ScopedResourceScopedComponentDefinition>;
      render: ScopedComponentRenderFn;
    };

    function createComponent(componentOptions: {
      props?: {
        include?: Record<string, true | 'optional'>;
        custom?: Record<string, AnyBuiltPropDefinition>;
      };
      resources?: Record<string, ScopedComponentEntry>;
      render: (
        props: Record<string, unknown>,
        context: Record<string, (props: never) => JSX.Element>,
      ) => ScopedRenderResult;
    }) {
      const include = componentOptions.props?.include ?? {};
      const custom = componentOptions.props?.custom ?? {};
      const selectedResources = new Set(
        resourceOptions.map(({ resource }) => resource),
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
          throw new Error(
            `Resource "${key}" is not available in this scoped component`,
          );
        }

        definedEntries.set(resource, entry);
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
              throw new Error(
                `Resource "${resource}" maps to the reserved render context key "Root"`,
              );
            }

            const existingResource = contextResources.get(contextKey);

            if (existingResource !== undefined) {
              throw new Error(
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
                throw new Error(
                  `Scoped component "${name}" for resource "${resource}" uses a reserved name`,
                );
              }

              const ownPropDefinitions = definition.props ?? {};

              function ScopedComponent(ownProps?: Record<string, unknown>) {
                const componentProps = useContext(componentPropsContext);

                if (componentProps === undefined) {
                  throw new Error(
                    `Scoped component "${name}" must be rendered inside its scoped component`,
                  );
                }

                const resolvedOwnProps = ownProps ?? {};

                validateProps(ownPropDefinitions, resolvedOwnProps);

                // Mount a returned component type with call-site props; pass
                // nodes (elements, portals, null) through unchanged.
                return resolveScopedRenderResult(
                  definition.render(
                    { ...componentProps, ...resolvedOwnProps, resource },
                    scopedComponents,
                  ),
                  resolvedOwnProps,
                );
              }

              // Types expose compound statics from the returned component
              // (`DataTable.Loading`); attach matching runtime wrappers.
              scopedComponents[name] = withScopedCompoundStatics(
                ScopedComponent,
                (staticName) => {
                  function CompoundStatic(ownProps?: Record<string, unknown>) {
                    const componentProps = useContext(componentPropsContext);

                    if (componentProps === undefined) {
                      throw new Error(
                        `Scoped component "${name}.${staticName}" must be rendered inside its scoped component`,
                      );
                    }

                    // Re-run render to read the static off the returned type.
                    // Call-site props for Loading are Loading's own, not the
                    // parent DataTable's — pass only layout context + resource.
                    const result = definition.render(
                      { ...componentProps, resource },
                      scopedComponents,
                    );

                    if (!isRenderableComponentType(result)) {
                      throw new Error(
                        `Scoped component "${name}" must return a component type to use static "${staticName}"`,
                      );
                    }

                    const staticComponent = (
                      result as ComponentType<Record<string, unknown>> &
                        Record<string, unknown>
                    )[staticName];

                    if (!isRenderableComponentType(staticComponent)) {
                      throw new Error(
                        `Scoped component "${name}" has no component static "${staticName}"`,
                      );
                    }

                    return createElement(staticComponent, ownProps ?? {});
                  }

                  CompoundStatic.displayName = `${name}.${staticName}`;
                  return CompoundStatic;
                },
              ) as (props?: never) => JSX.Element;
            }

            resourceScopedComponents.set(resource, scopedComponents);

            function ResourceRender() {
              const componentProps = useContext(componentPropsContext);

              if (componentProps === undefined) {
                throw new Error(
                  `Render context component "${contextKey}" must be rendered inside its scoped component`,
                );
              }

              // Same as scoped components: mount returned component types, keep
              // nodes (including portals) intact. No call-site props here.
              return resolveScopedRenderResult(
                entry.render(
                  { ...componentProps, resource },
                  scopedComponents,
                ),
              );
            }

            return [contextKey, Object.assign(ResourceRender, scopedComponents)];
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

      function getRoot(resource: LayoutResourceKey<Resources>) {
        let root = roots.get(resource);

        if (root === undefined) {
          const entry = definedEntries.get(resource);

          if (entry === undefined) {
            // Without an entry there are no create-time layout options, so a
            // layout with required props would fail validation deep inside
            // its own render. Fail here instead, naming the fix.
            throw new Error(
              `Render context component "Root" requires a "resources.${resource}" entry to build the layout for resource "${resource}"`,
            );
          }

          const { render: _render, ...layoutOptions } = entry;

          root = scopedCreateResourceLayout({
            ...layoutOptions,
            name:
              layoutOptions.name ??
              defaultNames.get(resource) ??
              capitalize(resource),
            resource,
          }) as (props: Record<string, unknown>) => JSX.Element;
          roots.set(resource, root);
        }

        return root;
      }

      function Root(rootProps: Record<string, unknown>) {
        const componentProps = useContext(componentPropsContext);

        if (componentProps === undefined) {
          throw new Error(
            'Render context component "Root" must be rendered inside its scoped component',
          );
        }

        return createElement(
          getRoot(componentProps.resource as LayoutResourceKey<Resources>),
          rootProps,
        );
      }

      renderContext.Root = Root;

      function Component(componentProps: Record<string, unknown>) {
        const componentResource =
          componentProps.resource as LayoutResourceKey<Resources>;

        if (!selectedResources.has(componentResource)) {
          throw new Error(
            `Resource "${componentResource}" is not available in this scoped component`,
          );
        }

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
          if (inclusion === true || key in componentProps) {
            definitionsToValidate[key] = definition;
          }
        }

        for (const [key, definition] of Object.entries(custom)) {
          if (key === 'children' || key === 'resource') {
            continue;
          }

          definitionsToValidate[key] = definition;
        }

        validateProps(definitionsToValidate, componentProps);

        // Top-level render may return a component type; mount it with the full
        // component props (include/custom + inferred return-type props).
        return createElement(
          componentPropsContext.Provider,
          { value: componentProps },
          resolveScopedRenderResult(
            componentOptions.render(componentProps, renderContext),
            componentProps,
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
          throw new Error(
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
          boundComponents.set(resource, boundComponent);
        }

        return boundComponent;
      }

      function asHOF() {
        return bindResource;
      }

      return Object.assign(Component, {
        asHOF,
        displayName: 'ScopedResourceComponent',
        props: undefined,
      });
    }

    const scopedExtras: {
      createComponent: typeof createComponent;
      forResource: typeof scopedForResource;
      makeComposable?: (options: Record<string, unknown>) => unknown;
      resources: undefined;
    } = {
      createComponent,
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
