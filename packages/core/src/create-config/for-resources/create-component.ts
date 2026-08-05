import type { ComponentType, JSX, ReactNode } from 'react';
import type { ComposableComponents } from '@jfdevelops/react-layout-composables';
import type {
  ResolveProps,
  ResolvedBuiltPropShape,
  SafeKeyOf,
} from '@jfdevelops/react-layout-validator';
import type {
  IncludedProps,
  InPropsDefinition,
  InPropsObject,
  MergedLayoutInProps,
  PropsContextRender,
  PropsRenderDefinition,
  ResolvedIncludedPropsAsDefined,
} from '../../props';
import type { ResourceDefinition } from '../../resource';
import type { BaseComponent, Show, UnionToIntersection } from '../../utils';
import type { LayoutIncludeProps, LayoutProps } from '../define-layout';
import type { SelectedLayoutResources } from './resource-selection';
import type { ScopedRenderResult } from './scoped-render';

export type ScopedComponentAvailableProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  LayoutCustomProps extends InPropsObject,
> = MergedLayoutInProps<Resources, InProps, Composables> & LayoutCustomProps;

type ResourceComponentResolvedAvailableProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  LayoutCustomProps extends InPropsObject,
  ComponentCustomProps extends InPropsObject,
  EntryCustomProps extends InPropsObject,
> = ResolvedBuiltPropShape<
  ScopedComponentAvailableProps<
    Resources,
    InProps,
    Composables,
    LayoutCustomProps
  > &
    ComponentCustomProps &
    EntryCustomProps
>;

/** Props declared by one resource entry or createResourceComponents call. */
export type ResourceComponentPropsBag<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
  LayoutCustomProps extends InPropsObject,
  ComponentCustomProps extends InPropsObject,
  Props extends object = {},
> = {
  include?: ResourceEntryInclude<Props> &
    LayoutIncludeProps<Resources, InProps, Composables> &
    Record<
      Exclude<
        SafeKeyOf<ResourceEntryInclude<Props>>,
        SafeKeyOf<LayoutIncludeProps<Resources, InProps, Composables>>
      >,
      never
    >;
  custom?: ResourceEntryCustom<Props>;
  defined?: ResourceEntryDefined<Props> &
    Partial<
      ResourceComponentResolvedAvailableProps<
        Resources,
        InProps,
        Composables,
        LayoutCustomProps,
        ComponentCustomProps,
        ResourceEntryCustom<Props>
      >
    > &
    Record<
      Exclude<
        SafeKeyOf<ResourceEntryDefined<Props>>,
        SafeKeyOf<
          ResourceComponentResolvedAvailableProps<
            Resources,
            InProps,
            Composables,
            LayoutCustomProps,
            ComponentCustomProps,
            ResourceEntryCustom<Props>
          >
        >
      >,
      never
    >;
};

type ResourceEntryProps<EntryOrProps> = EntryOrProps extends {
  render: unknown;
  props?: infer Props;
}
  ? Props
  : EntryOrProps;

type ResourceEntryInclude<EntryOrProps> =
  ResourceEntryProps<EntryOrProps> extends {
    include?: infer Include;
  }
    ? Include extends object
      ? Include
      : {}
    : {};

type ResourceEntryCustom<EntryOrProps> =
  ResourceEntryProps<EntryOrProps> extends {
    custom?: infer Custom;
  }
    ? Custom extends InPropsObject
      ? Custom
      : {}
    : {};

type ResourceEntryDefined<EntryOrProps> =
  ResourceEntryProps<EntryOrProps> extends {
    defined?: infer Defined;
  }
    ? Defined extends object
      ? Defined
      : {}
    : {};

type WithDefinedIncluded<Include, Defined extends object> = Omit<
  Include,
  SafeKeyOf<Defined>
> & {
  [Key in SafeKeyOf<Defined>]: true;
};

type WithDefinedOptional<Props, Defined extends object> = Show<
  Omit<Props, SafeKeyOf<Defined>> &
    Partial<Pick<Props, SafeKeyOf<Defined> & keyof Props>>
>;

type MergedResourceEntryInclude<PropsByResource> = UnionToIntersection<
  PropsByResource[keyof PropsByResource] extends infer Props
    ? Props extends unknown
      ? WithDefinedIncluded<
          ResourceEntryInclude<Props>,
          ResourceEntryDefined<Props>
        >
      : never
    : never
>;

type MergedResourceEntryCustom<PropsByResource> = UnionToIntersection<
  PropsByResource[keyof PropsByResource] extends infer Props
    ? Props extends unknown
      ? ResourceEntryCustom<Props>
      : never
    : never
>;

export type ScopedResourceComponentProps<
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
export type ScopedResourceComponentCallProps<
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
  DefinedProps extends object = {},
> = WithDefinedOptional<
  Show<
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
  >,
  DefinedProps
>;

/**
 * Fields reverse-inferred from each scoped component declaration.
 *
 * `props` reverse-maps as-is. `render` cannot reverse-map as a full function
 * type (that becomes `unknown`), so only its return type is preserved via
 * `(...args: any) => Return`. Call-site props and compound statics are then
 * read from that return type — prefer the raw capture intersection on entries
 * when both `props` and a returned component type must survive together.
 */
export type ScopedComponentShape = {
  props?: InPropsObject;
  render?: (...args: never[]) => unknown;
};

/**
 * Homomorphic pick of reverse-mapped scoped-component fields. Paired with a
 * mapped type over the components object, this lets each entry's inferred
 * `props` (and render return when inference succeeds) flow into signatures.
 */
export type JustScopedComponent<T> = {
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
export type NormalizeScopedComponentsMap<Components> =
  unknown extends Components
    ? {}
    : Components extends Record<string, unknown>
      ? Components
      : {};

/** Extracts the prop definitions declared on a scoped component. */
export type ScopedComponentOwnProps<Definition> = Definition extends {
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
export type IsScopedRenderableComponentType<Result> = [Result] extends [never]
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
export type PropsFromRenderResult<Result> = [Result] extends [never]
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

/**
 * Call-site props inferred from a scoped component's `render` return type.
 */
export type PropsFromScopedRender<Definition> = Definition extends {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- open args
  render: (...args: any) => infer Result;
}
  ? PropsFromRenderResult<Result>
  : {};

/**
 * Call-site props for a scoped component: declared `props` plus props of any
 * component type returned from `render`.
 */
export type ScopedComponentCallProps<Definition> = Show<
  ResolvedBuiltPropShape<ScopedComponentOwnProps<Definition>> &
    PropsFromScopedRender<Definition>
>;

/**
 * A scoped component's call signature. Components that declare no props are
 * callable with no arguments.
 */
export type ScopedComponentSignature<Props> = {} extends Props
  ? (props?: Props) => JSX.Element
  : (props: Props) => JSX.Element;

/**
 * Function-prototype / React statics that must not appear as compound
 * component keys on a scoped component resolved from a returned component type.
 */
export type ScopedComponentCompoundStaticKey =
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
export type ScopedComponentCompoundStatics<Result> = [Result] extends [never]
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
export type ResolvedScopedComponent<Definition> = ScopedComponentSignature<
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
export type ResolvedScopedComponentsMap<Components> = {
  [Name in keyof NormalizeScopedComponentsMap<Components>]: ResolvedScopedComponent<
    NormalizeScopedComponentsMap<Components>[Name]
  >;
};

/**
 * Call-site props for `context.<Resource>`: outermost createComponent
 * include/custom props (minus `resource`).
 */
export type ScopedResourceContextCallProps<
  ResourceDefinitions extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<ResourceDefinitions>,
  Composables extends ComposableComponents,
  LayoutCustomProps extends InPropsObject,
  ComponentIncludeProps extends IncludedProps<
    ScopedComponentAvailableProps<
      ResourceDefinitions,
      InProps,
      Composables,
      LayoutCustomProps
    >
  >,
  ComponentCustomProps extends InPropsObject,
  Resource extends string,
  DefinedProps extends object = {},
> = WithDefinedOptional<
  Show<
    Omit<
      ScopedResourceComponentProps<
        ResourceDefinitions,
        InProps,
        Composables,
        LayoutCustomProps,
        ComponentIncludeProps,
        ComponentCustomProps,
        Resource
      >,
      'resource'
    >
  >,
  DefinedProps
>;

export type ScopedResourceComponentRenderContext<
  ResourceDefinitions extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<ResourceDefinitions>,
  Composables extends ComposableComponents,
  LayoutCustomProps extends InPropsObject,
  ComponentIncludeProps extends IncludedProps<
    ScopedComponentAvailableProps<
      ResourceDefinitions,
      InProps,
      Composables,
      LayoutCustomProps
    >
  >,
  ComponentCustomProps extends InPropsObject,
  ComponentsByResource,
  PropsByResource,
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
  >]-?: ScopedComponentSignature<
    ScopedResourceContextCallProps<
      ResourceDefinitions,
      InProps,
      Composables,
      LayoutCustomProps,
      ComponentIncludeProps,
      ComponentCustomProps,
      Resource & string,
      ResourceEntryDefined<
        Resource extends keyof PropsByResource ? PropsByResource[Resource] : {}
      >
    >
  > &
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
 *
 * Entry keys are only `name`, `components`, and `render`. Layout option values
 * like `title` are excess-property errors here — they belong on
 * `context.<Resource>` / the outer component call site.
 *
 * Each scoped component is `JustScopedComponent<Captured> & Precise & Captured`:
 * the homomorphic pick reverse-infers `props`, the precise `render`
 * contextually types parameters, and the raw capture keeps the literal for
 * call-site resolution.
 */
export type ScopedComponentResourceEntry<
  ResourceDefinitions extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<ResourceDefinitions>,
  Composables extends ComposableComponents,
  LayoutCustomProps extends InPropsObject,
  ComponentIncludeProps extends IncludedProps<
    ScopedComponentAvailableProps<
      ResourceDefinitions,
      InProps,
      Composables,
      LayoutCustomProps
    >
  >,
  ComponentCustomProps extends InPropsObject,
  Resource extends string,
  EntryProps extends object,
  Components,
> = {
  /**
   * Overrides the layout name used by `context.Root` for this resource.
   * Defaults to the scope's configured name, then the capitalized resource.
   */
  name?: string;
  /** Props exposed or pre-filled for this resource entry. */
  props?: EntryProps;
  /**
   * Components scoped to this resource. Each becomes a component on this
   * resource's render context, on `context.<Resource>`, and on the component
   * returned by `asHOF()`.
   */
  components?: {
    [Name in keyof Components]: JustScopedComponent<Components[Name]> &
      /**
       * Renders this component. Receives the scoped component's props plus
       * this component's own props, and the other components for this
       * resource (excluding itself).
       *
       * May return a React node or a component type (mounted with the
       * call-site props). Props and compound statics of a returned component
       * type are inferred at call sites from the render return type.
       */
      PropsRenderDefinition<
        InPropsObject,
        ScopedResourceComponentProps<
          ResourceDefinitions,
          InProps,
          Composables,
          LayoutCustomProps,
          WithDefinedIncluded<
            ComponentIncludeProps & ResourceEntryInclude<EntryProps>,
            ResourceEntryDefined<EntryProps>
          >,
          ComponentCustomProps & ResourceEntryCustom<EntryProps>,
          Resource
        > &
          Show<
            ResolvedBuiltPropShape<ScopedComponentOwnProps<Components[Name]>>
          >,
        ScopedRenderResult,
        Omit<ResolvedScopedComponentsMap<Components>, Name>
      > &
      Components[Name];
  };
  /** Renders this resource's content inside the shared render function. */
  render: PropsContextRender<
    ScopedResourceComponentProps<
      ResourceDefinitions,
      InProps,
      Composables,
      LayoutCustomProps,
      WithDefinedIncluded<
        ComponentIncludeProps & ResourceEntryInclude<EntryProps>,
        ResourceEntryDefined<EntryProps>
      >,
      ComponentCustomProps & ResourceEntryCustom<EntryProps>,
      Resource
    >,
    ResolvedScopedComponentsMap<Components>,
    ScopedRenderResult
  >;
};

export type ScopedComponentResourceEntries<
  ResourceDefinitions extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<ResourceDefinitions>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  LayoutCustomProps extends InPropsObject,
  ComponentIncludeProps extends IncludedProps<
    ScopedComponentAvailableProps<
      ResourceDefinitions,
      InProps,
      Composables,
      LayoutCustomProps
    >
  >,
  ComponentCustomProps extends InPropsObject,
  PropsByResource,
  ComponentsByResource,
> = {
  [Resource in keyof ComponentsByResource]: ScopedComponentResourceEntry<
    ResourceDefinitions,
    InProps,
    Composables,
    LayoutCustomProps,
    ComponentIncludeProps,
    ComponentCustomProps,
    Resource & string,
    Resource extends keyof PropsByResource
      ? PropsByResource[Resource] & object
      : {},
    ComponentsByResource[Resource]
  > & {
    props?: Resource extends keyof PropsByResource
      ? PropsByResource[Resource] extends object
        ? PropsByResource[Resource] &
            ResourceComponentPropsBag<
              ResourceDefinitions,
              InProps,
              Composables,
              LayoutCustomProps,
              ComponentCustomProps,
              NoInfer<PropsByResource[Resource]>
            >
        : unknown
      : unknown;
  };
} & Record<
  Exclude<
    keyof ComponentsByResource,
    SelectedLayoutResources<ResourceDefinitions, Arguments>
  >,
  never
>;

/**
 * Props of a resource-bound component. `resource` is supplied by the binding,
 * so it is removed from the call site.
 */
export type ScopedBoundResourceComponentProps<
  ResourceDefinitions extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<ResourceDefinitions>,
  Composables extends ComposableComponents,
  LayoutCustomProps extends InPropsObject,
  ComponentIncludeProps extends IncludedProps<
    ScopedComponentAvailableProps<
      ResourceDefinitions,
      InProps,
      Composables,
      LayoutCustomProps
    >
  >,
  ComponentCustomProps extends InPropsObject,
  Resource extends string,
  RenderResult = never,
  DefinedProps extends object = {},
> = Show<
  Omit<
    ScopedResourceComponentCallProps<
      ResourceDefinitions,
      InProps,
      Composables,
      LayoutCustomProps,
      ComponentIncludeProps,
      ComponentCustomProps,
      Resource,
      RenderResult,
      DefinedProps
    >,
    'resource'
  >
>;

export type ScopedBoundResourceComponent<
  Props extends object,
  Resource extends string,
  Components = {},
> = BaseComponent<string, Props> &
  ResolvedScopedComponentsMap<Components> & {
    (props: Props): JSX.Element;
    /**
     * Type-only property containing the bound resource. This property is
     * `undefined` at runtime.
     */
    readonly resource: Resource;
  };

export type ScopedResourceComponent<
  ResourceDefinitions extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<ResourceDefinitions>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  LayoutCustomProps extends InPropsObject,
  ComponentIncludeProps extends IncludedProps<
    ScopedComponentAvailableProps<
      ResourceDefinitions,
      InProps,
      Composables,
      LayoutCustomProps
    >
  >,
  ComponentCustomProps extends InPropsObject,
  ComponentsByResource,
  PropsByResource,
  RenderResult = never,
> = BaseComponent<
  string,
  ScopedResourceComponentCallProps<
    ResourceDefinitions,
    InProps,
    Composables,
    LayoutCustomProps,
    ComponentIncludeProps,
    ComponentCustomProps,
    SelectedLayoutResources<ResourceDefinitions, Arguments>,
    RenderResult,
    ResourceEntryDefined<PropsByResource[keyof PropsByResource]>
  >
> & {
  /**
   * The `resource` prop drives the generic, so it is inferred from the call
   * site. Explicit type arguments are never needed.
   */
  <
    const Resource extends SelectedLayoutResources<
      ResourceDefinitions,
      Arguments
    >,
  >(
    props: ScopedResourceComponentCallProps<
      ResourceDefinitions,
      InProps,
      Composables,
      LayoutCustomProps,
      ComponentIncludeProps,
      ComponentCustomProps,
      Resource,
      RenderResult,
      ResourceEntryDefined<
        Resource extends keyof PropsByResource ? PropsByResource[Resource] : {}
      >
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
    const Resource extends SelectedLayoutResources<
      ResourceDefinitions,
      Arguments
    >,
  >(
    resource: Resource,
  ) => Show<
    ScopedBoundResourceComponent<
      ScopedBoundResourceComponentProps<
        ResourceDefinitions,
        InProps,
        Composables,
        LayoutCustomProps,
        ComponentIncludeProps,
        ComponentCustomProps,
        Resource,
        RenderResult,
        ResourceEntryDefined<
          Resource extends keyof PropsByResource
            ? PropsByResource[Resource]
            : {}
        >
      >,
      Resource,
      Resource extends keyof ComponentsByResource
        ? ComponentsByResource[Resource]
        : {}
    >
  >;
};

/**
 * Props bag for `setProps` / optional extras: forbids keys already present on
 * the base include/custom from `setProps`.
 */
export type ScopedComponentExtraProps<
  ResourceDefinitions extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<ResourceDefinitions>,
  Composables extends ComposableComponents,
  BaseInclude extends LayoutIncludeProps<
    ResourceDefinitions,
    InProps,
    Composables
  >,
  BaseCustom extends InPropsObject,
  ExtraInclude extends LayoutIncludeProps<
    ResourceDefinitions,
    InProps,
    Composables
  > = {},
  ExtraCustom extends InPropsObject = {},
> = {
  include?: ExtraInclude & {
    [Key in keyof BaseInclude & string]?: never;
  };
  custom?: ExtraCustom & {
    [Key in keyof BaseCustom & string]?: never;
  };
};

/**
 * Builds a single resource entry for use under `resources`, typed against
 * setProps base props plus optional CRC extras (keys already on the base are
 * forbidden).
 *
 * `render` is typed with {@link PropsContextRender} (not an open
 * `(...args: any) => …`) so destructured props stay precise — an `any`
 * constraint on Options would collapse them.
 */
export type ScopedCreateResourceComponents<
  ResourceDefinitions extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<ResourceDefinitions>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  LayoutCustomProps extends InPropsObject,
  BaseInclude extends LayoutIncludeProps<
    ResourceDefinitions,
    InProps,
    Composables
  >,
  BaseCustom extends InPropsObject,
> = <
  const Resource extends SelectedLayoutResources<
    ResourceDefinitions,
    Arguments
  >,
  // No default: same contextual-typing hazard as ComponentsByResource. Must
  // precede ExtraInclude/ExtraCustom (those have defaults). When `components`
  // is omitted, NormalizeScopedComponentsMap turns `unknown` into `{}`.
  // Do not wrap Components in Normalize* on the input `components` field —
  // that collapses reverse inference to `{}`.
  const Components,
  const Props extends object = {},
>(options: {
  resource: Resource;
  props?: Props &
    ResourceComponentPropsBag<
      ResourceDefinitions,
      InProps,
      Composables,
      LayoutCustomProps,
      BaseCustom,
      NoInfer<Props>
    > & {
      include?: ResourceEntryInclude<Props> & {
        [Key in keyof BaseInclude & string]?: never;
      };
      custom?: ResourceEntryCustom<Props> & {
        [Key in keyof BaseCustom & string]?: never;
      };
    };
  name?: string;
  components?: {
    [Name in keyof Components]: JustScopedComponent<Components[Name]> &
      PropsRenderDefinition<
        InPropsObject,
        ScopedResourceComponentProps<
          ResourceDefinitions,
          InProps,
          Composables,
          LayoutCustomProps,
          WithDefinedIncluded<
            BaseInclude & ResourceEntryInclude<Props>,
            ResourceEntryDefined<Props>
          >,
          BaseCustom & ResourceEntryCustom<Props>,
          Resource
        > &
          Show<
            ResolvedBuiltPropShape<ScopedComponentOwnProps<Components[Name]>>
          >,
        ScopedRenderResult,
        Omit<ResolvedScopedComponentsMap<Components>, Name>
      > &
      Components[Name];
  };
  render: PropsContextRender<
    ScopedResourceComponentProps<
      ResourceDefinitions,
      InProps,
      Composables,
      LayoutCustomProps,
      WithDefinedIncluded<
        BaseInclude & ResourceEntryInclude<Props>,
        ResourceEntryDefined<Props>
      >,
      BaseCustom & ResourceEntryCustom<Props>,
      Resource
    >,
    ResolvedScopedComponentsMap<NormalizeScopedComponentsMap<Components>>,
    ScopedRenderResult
  >;
}) => ScopedComponentResourceEntry<
  ResourceDefinitions,
  InProps,
  Composables,
  LayoutCustomProps,
  BaseInclude,
  BaseCustom,
  Resource,
  Props,
  NormalizeScopedComponentsMap<Components>
> & {
  props: Props;
  /** Type-only metadata preserving the exact captured props bag. */
  readonly resourceComponentProps: Props;
};

/**
 * Options for {@link ScopedCreateComponent}. Extends the shared
 * `{ props?, render }` shape; `props` is the layout include/custom bag, and
 * `render` receives component props plus the resource context (`Root` and
 * capitalized per-resource components).
 *
 * May return a React node or a component type (mounted with the component
 * props). When a component type is returned, its props are merged into the
 * created component's call signature via `RenderResult` /
 * `ScopedResourceComponentCallProps` — they are intentionally *not* added
 * to the `render` `props` parameter (that would circularly depend on the
 * return).
 */
export interface ScopedCreateComponentOptions<
  ResourceDefinitions extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<ResourceDefinitions>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  LayoutCustomProps extends InPropsObject,
  ComponentIncludeProps extends LayoutIncludeProps<
    ResourceDefinitions,
    InProps,
    Composables
  >,
  ComponentCustomProps extends InPropsObject,
  PropsByResource,
  ComponentsByResource,
  RenderResult extends ScopedRenderResult,
> extends PropsRenderDefinition<
  LayoutProps<
    ResourceDefinitions,
    InProps,
    Composables,
    ComponentIncludeProps,
    ComponentCustomProps
  >,
  ScopedResourceComponentProps<
    ResourceDefinitions,
    InProps,
    Composables,
    LayoutCustomProps,
    ComponentIncludeProps & MergedResourceEntryInclude<PropsByResource>,
    ComponentCustomProps & MergedResourceEntryCustom<PropsByResource>,
    SelectedLayoutResources<ResourceDefinitions, Arguments>
  >,
  RenderResult,
  ScopedResourceComponentRenderContext<
    ResourceDefinitions,
    InProps,
    Composables,
    LayoutCustomProps,
    ComponentIncludeProps & MergedResourceEntryInclude<PropsByResource>,
    ComponentCustomProps & MergedResourceEntryCustom<PropsByResource>,
    ComponentsByResource,
    PropsByResource
  >
> {
  /**
   * Per-resource content, keyed by resource. Each entry holds that resource's
   * scoped `components` and its `render` — not layout option values like
   * `title` (those are call-site props on `context.<Resource>` / the outer
   * component).
   */
  resources?: ScopedComponentResourceEntries<
    ResourceDefinitions,
    InProps,
    Composables,
    Arguments,
    LayoutCustomProps,
    ComponentIncludeProps & MergedResourceEntryInclude<PropsByResource>,
    ComponentCustomProps & MergedResourceEntryCustom<PropsByResource>,
    PropsByResource,
    ComponentsByResource
  >;
}

/**
 * Options for a `setProps` thunk: same as createComponent options, but
 * optional `props` may only add keys not already defined by `setProps`.
 */
export type ScopedCreateComponentWithPropsOptions<
  ResourceDefinitions extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<ResourceDefinitions>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  LayoutCustomProps extends InPropsObject,
  BaseInclude extends LayoutIncludeProps<
    ResourceDefinitions,
    InProps,
    Composables
  >,
  BaseCustom extends InPropsObject,
  ExtraInclude extends LayoutIncludeProps<
    ResourceDefinitions,
    InProps,
    Composables
  >,
  ExtraCustom extends InPropsObject,
  PropsByResource,
  ComponentsByResource,
  RenderResult extends ScopedRenderResult,
> = Omit<
  ScopedCreateComponentOptions<
    ResourceDefinitions,
    InProps,
    Composables,
    Arguments,
    LayoutCustomProps,
    BaseInclude & ExtraInclude,
    BaseCustom & ExtraCustom,
    PropsByResource,
    ComponentsByResource,
    RenderResult
  >,
  'props'
> & {
  props?: ScopedComponentExtraProps<
    ResourceDefinitions,
    InProps,
    Composables,
    BaseInclude,
    BaseCustom,
    ExtraInclude,
    ExtraCustom
  >;
};

export type ScopedCreateComponentFn<
  ResourceDefinitions extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<ResourceDefinitions>,
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
  const ComponentIncludeProps extends LayoutIncludeProps<
    ResourceDefinitions,
    InProps,
    Composables
  > = {},
  ComponentCustomProps extends InPropsObject = {},
>(
  options: ScopedCreateComponentOptions<
    ResourceDefinitions,
    InProps,
    Composables,
    Arguments,
    LayoutCustomProps,
    ComponentIncludeProps,
    ComponentCustomProps,
    {},
    ComponentsByResource,
    RenderResult
  >,
) => ScopedResourceComponent<
  ResourceDefinitions,
  InProps,
  Composables,
  Arguments,
  LayoutCustomProps,
  ComponentIncludeProps,
  ComponentCustomProps,
  ComponentsByResource,
  {},
  RenderResult
>;

type ComponentsForResourceProps<PropsByResource, ComponentsByResource> = {
  [Resource in keyof PropsByResource]: Resource extends keyof ComponentsByResource
    ? NormalizeScopedComponentsMap<ComponentsByResource[Resource]>
    : {};
};

type PropsFromCreatedResourceEntries<EntriesByResource> = {
  [Resource in keyof EntriesByResource]: EntriesByResource[Resource] extends {
    readonly resourceComponentProps: infer Props extends object;
  }
    ? Props
    : {};
};

type ComponentsFromCreatedResourceEntries<EntriesByResource> = {
  [Resource in keyof EntriesByResource]: EntriesByResource[Resource] extends {
    components?: infer Components;
  }
    ? NormalizeScopedComponentsMap<Components>
    : {};
};

type ScopedCreateComponentWithCreatedEntriesFn<
  ResourceDefinitions extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<ResourceDefinitions>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  LayoutCustomProps extends InPropsObject,
  BaseInclude extends LayoutIncludeProps<
    ResourceDefinitions,
    InProps,
    Composables
  > = {},
  BaseCustom extends InPropsObject = {},
> = <
  const EntriesByResource,
  const RenderResult extends ScopedRenderResult,
  const ExtraInclude extends LayoutIncludeProps<
    ResourceDefinitions,
    InProps,
    Composables
  > = {},
  ExtraCustom extends InPropsObject = {},
>(
  options: Omit<
    ScopedCreateComponentOptions<
      ResourceDefinitions,
      InProps,
      Composables,
      Arguments,
      LayoutCustomProps,
      BaseInclude & ExtraInclude,
      BaseCustom & ExtraCustom,
      PropsFromCreatedResourceEntries<NoInfer<EntriesByResource>>,
      ComponentsFromCreatedResourceEntries<NoInfer<EntriesByResource>>,
      RenderResult
    >,
    'resources'
  > & {
    resources: {
      [Resource in keyof EntriesByResource]: EntriesByResource[Resource] & {
        readonly resourceComponentProps: object;
      };
    };
  },
) => ScopedResourceComponent<
  ResourceDefinitions,
  InProps,
  Composables,
  Arguments,
  LayoutCustomProps,
  BaseInclude &
    ExtraInclude &
    MergedResourceEntryInclude<
      PropsFromCreatedResourceEntries<EntriesByResource>
    >,
  BaseCustom &
    ExtraCustom &
    MergedResourceEntryCustom<
      PropsFromCreatedResourceEntries<EntriesByResource>
    >,
  ComponentsFromCreatedResourceEntries<EntriesByResource>,
  PropsFromCreatedResourceEntries<EntriesByResource>,
  RenderResult
>;

/** createComponent overload for entries that declare the unified props bag. */
export type ScopedCreateComponentWithResourcePropsFn<
  ResourceDefinitions extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<ResourceDefinitions>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  LayoutCustomProps extends InPropsObject,
  BaseInclude extends LayoutIncludeProps<
    ResourceDefinitions,
    InProps,
    Composables
  > = {},
  BaseCustom extends InPropsObject = {},
> = <
  const PropsByResource,
  const ComponentsByResource,
  const RenderResult extends ScopedRenderResult,
  const ExtraInclude extends LayoutIncludeProps<
    ResourceDefinitions,
    InProps,
    Composables
  > = {},
  ExtraCustom extends InPropsObject = {},
>(
  options: Omit<
    ScopedCreateComponentOptions<
      ResourceDefinitions,
      InProps,
      Composables,
      Arguments,
      LayoutCustomProps,
      BaseInclude & ExtraInclude,
      BaseCustom & ExtraCustom,
      PropsByResource,
      ComponentsForResourceProps<PropsByResource, ComponentsByResource>,
      RenderResult
    >,
    'resources'
  > & {
    resources: {
      [Resource in keyof PropsByResource]: ScopedComponentResourceEntry<
        ResourceDefinitions,
        InProps,
        Composables,
        LayoutCustomProps,
        BaseInclude &
          ExtraInclude &
          MergedResourceEntryInclude<PropsByResource>,
        BaseCustom & ExtraCustom & MergedResourceEntryCustom<PropsByResource>,
        Resource & string,
        PropsByResource[Resource] & object,
        Resource extends keyof ComponentsByResource
          ? ComponentsByResource[Resource]
          : unknown
      > & {
        props: PropsByResource[Resource] &
          ResourceComponentPropsBag<
            ResourceDefinitions,
            InProps,
            Composables,
            LayoutCustomProps,
            BaseCustom &
              ExtraCustom &
              MergedResourceEntryCustom<PropsByResource>,
            NoInfer<PropsByResource[Resource] & object>
          >;
        components?: Resource extends keyof ComponentsByResource
          ? ComponentsByResource[Resource]
          : unknown;
      };
    } & Record<
      Exclude<
        keyof PropsByResource,
        SelectedLayoutResources<ResourceDefinitions, Arguments>
      >,
      never
    >;
  },
) => ScopedResourceComponent<
  ResourceDefinitions,
  InProps,
  Composables,
  Arguments,
  LayoutCustomProps,
  BaseInclude & ExtraInclude & MergedResourceEntryInclude<PropsByResource>,
  BaseCustom & ExtraCustom & MergedResourceEntryCustom<PropsByResource>,
  ComponentsForResourceProps<PropsByResource, ComponentsByResource>,
  PropsByResource,
  RenderResult
>;

/**
 * Result of `createComponent.setProps`: a createComponent thunk with base
 * include/custom prefilled, optional extras that cannot redefine base keys,
 * and `createResourceComponents` for shared resource entries.
 *
 * Merged props (base ∪ extras) type the returned component, top-level
 * `render`, and `context.<Resource>` call sites.
 */
export type ScopedCreateComponentWithProps<
  ResourceDefinitions extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<ResourceDefinitions>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  LayoutCustomProps extends InPropsObject,
  BaseInclude extends LayoutIncludeProps<
    ResourceDefinitions,
    InProps,
    Composables
  >,
  BaseCustom extends InPropsObject,
> = ScopedCreateComponentWithCreatedEntriesFn<
  ResourceDefinitions,
  InProps,
  Composables,
  Arguments,
  LayoutCustomProps,
  BaseInclude,
  BaseCustom
> &
  ScopedCreateComponentWithResourcePropsFn<
    ResourceDefinitions,
    InProps,
    Composables,
    Arguments,
    LayoutCustomProps,
    BaseInclude,
    BaseCustom
  > & {
    <
      const ComponentsByResource,
      const PropsByResource,
      const RenderResult extends ScopedRenderResult,
      const ExtraInclude extends LayoutIncludeProps<
        ResourceDefinitions,
        InProps,
        Composables
      > = {},
      ExtraCustom extends InPropsObject = {},
    >(
      options: ScopedCreateComponentWithPropsOptions<
        ResourceDefinitions,
        InProps,
        Composables,
        Arguments,
        LayoutCustomProps,
        BaseInclude,
        BaseCustom,
        ExtraInclude,
        ExtraCustom,
        PropsByResource,
        ComponentsByResource,
        RenderResult
      >,
    ): ScopedResourceComponent<
      ResourceDefinitions,
      InProps,
      Composables,
      Arguments,
      LayoutCustomProps,
      BaseInclude & ExtraInclude & MergedResourceEntryInclude<PropsByResource>,
      BaseCustom & ExtraCustom & MergedResourceEntryCustom<PropsByResource>,
      ComponentsByResource,
      PropsByResource,
      RenderResult
    >;
    createResourceComponents: ScopedCreateResourceComponents<
      ResourceDefinitions,
      InProps,
      Composables,
      Arguments,
      LayoutCustomProps,
      BaseInclude,
      BaseCustom
    >;
  };

export type ScopedCreateComponentSetProps<
  ResourceDefinitions extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<ResourceDefinitions>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  LayoutCustomProps extends InPropsObject,
> = <
  const BaseInclude extends LayoutIncludeProps<
    ResourceDefinitions,
    InProps,
    Composables
  > = {},
  BaseCustom extends InPropsObject = {},
>(
  props: LayoutProps<
    ResourceDefinitions,
    InProps,
    Composables,
    BaseInclude,
    BaseCustom
  >,
) => ScopedCreateComponentWithProps<
  ResourceDefinitions,
  InProps,
  Composables,
  Arguments,
  LayoutCustomProps,
  BaseInclude,
  BaseCustom
>;

export type ScopedCreateComponent<
  ResourceDefinitions extends ReadonlyArray<ResourceDefinition>,
  InProps extends InPropsDefinition<ResourceDefinitions>,
  Composables extends ComposableComponents,
  Arguments extends ReadonlyArray<unknown>,
  LayoutCustomProps extends InPropsObject,
> = ScopedCreateComponentFn<
  ResourceDefinitions,
  InProps,
  Composables,
  Arguments,
  LayoutCustomProps
> &
  ScopedCreateComponentWithResourcePropsFn<
    ResourceDefinitions,
    InProps,
    Composables,
    Arguments,
    LayoutCustomProps
  > & {
    /**
     * Prefills include/custom props for a shared createComponent thunk. The
     * thunk still accepts optional extra props (keys already set here are
     * forbidden) and exposes `createResourceComponents` for reusable entries.
     */
    setProps: ScopedCreateComponentSetProps<
      ResourceDefinitions,
      InProps,
      Composables,
      Arguments,
      LayoutCustomProps
    >;
  };
