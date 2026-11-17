import {
  ComponentType,
  createContext,
  ReactNode,
  useContext,
  cloneElement,
  isValidElement,
} from 'react';
import {
  ConflictingPresetPropError,
  EmptyComponentsError,
  InvalidComponentsError,
  InvalidPropRenameError,
} from './errors';
import {
  PropDefinition,
  type PropValidationContext,
  ResolveProps,
  ResolveInputProps,
  type StandardSchemaV1,
  resolvePropDefinitionValues,
  validateProps,
} from '@jfdevelops/react-layout-validator';
import { InPropsObject, type WithChildren } from './types';
import type {
  BaseComponent,
  CapitalizeFn,
  Show,
  UnionToIntersection,
} from '@jfdevelops/react-layout-internals';

export const composablePresetMetaKey = Symbol.for(
  'view-map.composable-preset-meta',
);

const validatedInPropsObject = Symbol('validatedInPropsObject');

export type ComposablePresetMeta<Props extends InPropsObject = InPropsObject> =
  {
    key: string;
    props: Props;
  };

export type ComposablePresetProps = Record<string, Record<string, unknown>>;

const composablePresetPropsContext = createContext<
  ComposablePresetProps | undefined
>(undefined);

export function LayoutComposablePresetProvider({
  value,
  children,
}: {
  value: ComposablePresetProps;
  children: ReactNode;
}) {
  return (
    <composablePresetPropsContext.Provider value={value}>
      {children}
    </composablePresetPropsContext.Provider>
  );
}

function useComposablePresetProps(key: string) {
  return useContext(composablePresetPropsContext)?.[key];
}

export function collectComposablePresetEntries(
  composables: ComposableComponents | undefined,
) {
  if (!composables) {
    return [] as Array<{
      key: string;
      props: InPropsObject;
    }>;
  }

  const declared = new Map<
    string,
    {
      composable: string;
      definition: PropDefinition;
    }
  >();

  return Object.entries(composables).flatMap(([objectKey, component]) => {
    const meta = (component as ComposablePresetComponent)[
      composablePresetMetaKey
    ];

    if (!meta) {
      return [];
    }

    const key = meta.key ?? objectKey;

    // One page value feeds every preset declaring a prop, so the definitions
    // must be the same one.
    for (const [prop, definition] of Object.entries(meta.props)) {
      const existing = declared.get(prop);

      if (existing && existing.definition !== definition) {
        throw new ConflictingPresetPropError({
          prop,
          composables: [existing.composable, key],
        });
      }

      declared.set(prop, {
        composable: key,
        definition,
      });
    }

    return [
      {
        key,
        props: meta.props,
      },
    ];
  });
}

export function resolveComposablePresetProps(
  composables: ComposableComponents | undefined,
  layoutOptions: Record<string, unknown>,
  context?: PropValidationContext,
) {
  const resolved: ComposablePresetProps = {};

  for (const { key, props } of collectComposablePresetEntries(composables)) {
    const propKeys = Object.keys(props);
    const values = Object.fromEntries(
      propKeys.flatMap((propKey) => {
        if (!(propKey in layoutOptions)) {
          return [];
        }

        return [[propKey, layoutOptions[propKey]]];
      }),
    );

    resolved[key] = validateProps(
      props as Record<string, PropDefinition>,
      values,
      context,
    );
  }

  return resolved;
}

export type ComposableNameContext<
  Resource extends string,
  LayoutName extends string = string,
> = {
  resource: Resource;
  name: LayoutName;
  capitalize: CapitalizeFn;
};

type ComposableComponentName<
  Name extends string,
  Resource extends string,
  LayoutName extends string = string,
> = Name | ((ctx: ComposableNameContext<Resource, LayoutName>) => Name);

type CreateComposableComponentOptions<
  Name extends string,
  Wrapper,
  Resource extends string,
  LayoutName extends string = string,
  InProps extends InPropsObject = {},
  OutProps = {},
> = {
  name: ComposableComponentName<Name, Resource, LayoutName>;
  inProps?: InProps;
  outProps?: (props: Show<ResolveProps<InProps>>) => OutProps;
  wrapWith?: Wrapper;
};

type ResolvedCreateComposableComponentOptions<
  Name extends string,
  Wrapper,
  Resource extends string,
  LayoutName extends string = string,
  InProps extends InPropsObject = {},
  OutProps = {},
> = Omit<
  CreateComposableComponentOptions<
    Name,
    Wrapper,
    Resource,
    LayoutName,
    InProps,
    OutProps
  >,
  'name'
> & {
  name: Name;
};

export type CreateLayoutComposable<
  Resources extends string,
  LayoutName extends string = string,
> = <
  const Name extends string,
  Wrapper,
  InProps extends InPropsObject = {},
  OutProps = {},
>(
  options: CreateComposableComponentOptions<
    Name,
    Wrapper,
    Resources,
    LayoutName,
    InProps,
    OutProps
  >,
) => ComposableComponent<Name, Wrapper, InProps, OutProps>;

export type LayoutComposablesFactory<
  Resources extends string,
  LayoutName extends string = string,
> = (
  create: CreateLayoutComposable<Resources, LayoutName>,
) => ComposableComponents;

export type ResolveLayoutComposables<
  Factory extends LayoutComposablesFactory<string> | undefined,
> = Factory extends LayoutComposablesFactory<string> ? ReturnType<Factory> : {};

type ComposableComponentWrapperProps<Wrapper> =
  Wrapper extends ComponentType<infer Props> ? Omit<Props, 'children'> : {};

type ComposableComponentProps<
  Wrapper,
  InProps extends InPropsObject = {},
  OutProps = {},
> = ComposableComponentWrapperProps<Wrapper> &
  (keyof InProps extends never ? {} : ResolveInputProps<InProps>) & {
    children?: [keyof InProps] extends [never]
      ? ReactNode
      : ((props: OutProps) => JSX.Element) | ReactNode;
  };

export type ComposableComponent<
  Name extends string,
  Wrapper,
  InProps extends InPropsObject = {},
  OutProps = {},
> = BaseComponent<Name, ResolveInputProps<InProps>> & {
  (props: ComposableComponentProps<Wrapper, InProps, OutProps>): ReactNode;
};

export type ComposableResourceLayout<
  Composables extends ComposableComponents,
  Name extends string,
  Wrapper,
  InProps extends InPropsObject = {},
  OutProps = {},
> = Composables & ComposableComponent<Name, Wrapper, InProps, OutProps>;

export type AnyComposableComponent = ComposableComponent<
  string,
  any,
  InPropsObject,
  any
>;

/**
 * Minimal callable shape shared by layout and preset composables.
 * Used as the record value so preset components keep their own prop types.
 */
export type ComposableComponentCallable = {
  displayName: string;
  props: unknown;
  (...args: any[]): ReactNode;
};

// Separate installed versions declare distinct unique symbols for the same
// Symbol.for key. Read the metadata structurally so their presets interoperate.
type PresetPropsFromMetadata<Component> = {
  [Key in keyof Component]-?: Key extends symbol
    ? Component[Key] extends ComposablePresetMeta<infer Props>
      ? Props
      : never
    : never;
}[keyof Component];

export type PresetPropsFromComposable<Component> = Component extends {
  [composablePresetMetaKey]: ComposablePresetMeta<infer Props>;
}
  ? Props
  : [PresetPropsFromMetadata<Component>] extends [never]
    ? {}
    : PresetPropsFromMetadata<Component>;

export type MergePresetProps<Composables extends ComposableComponents> = Show<
  UnionToIntersection<PresetPropsFromComposable<Composables[keyof Composables]>>
>;

export type RequiredPresetRenderProps<Props extends InPropsObject> = {
  [K in keyof ResolveProps<Props> & string]-?: ResolveProps<Props>[K];
};

type SchemaDefinitions<Props extends InPropsObject> = {
  [
    Key in keyof Props as Props[Key] extends StandardSchemaV1 ? Key : never
  ]: Props[Key];
};

type PresetInputProps<Props extends InPropsObject> = ResolveInputProps<
  SchemaDefinitions<Props>
> &
  RequiredPresetRenderProps<Omit<Props, keyof SchemaDefinitions<Props>>>;

export type ComposablePresetComponentCallProps<
  Props extends InPropsObject,
  Wrapper = undefined,
> = WithChildren<PresetInputProps<Props>> &
  (Wrapper extends undefined ? {} : ComposableComponentWrapperProps<Wrapper>);

export type ComposablePresetComponent<
  Name extends string = string,
  Props extends InPropsObject = InPropsObject,
  Wrapper = undefined,
> = BaseComponent<Name, Show<WithChildren<ResolveInputProps<Props>>>> & {
  [composablePresetMetaKey]: ComposablePresetMeta<Props>;
} & ((props: ComposablePresetComponentCallProps<Props, Wrapper>) => ReactNode);

type PresetPropDefinitions<Composables extends ComposableComponents> =
  MergePresetProps<Composables> extends InPropsObject
    ? MergePresetProps<Composables>
    : {};

type PresetLayoutInputProps<Props extends InPropsObject> = ResolveInputProps<
  SchemaDefinitions<Props>
> & {
  [
    Key in keyof ResolveProps<Omit<Props, keyof SchemaDefinitions<Props>>>
  ]-?: ResolveProps<Omit<Props, keyof SchemaDefinitions<Props>>>[Key];
};

export type RequiredPresetLayoutProps<
  Composables extends ComposableComponents,
> = PresetLayoutInputProps<PresetPropDefinitions<Composables>>;

export type ComposableComponents = Record<string, ComposableComponentCallable>;

export type ResolvedComposableComponents<
  Components extends ComposableComponents,
> = [keyof Components] extends [never]
  ? never
  : Components extends { Layout: infer _ }
    ? Components
    : 'The Layout composable is required';

function resolveComponent<Props>(
  component: ((props: Props) => JSX.Element | ReactNode) | ReactNode,
  props: Props,
) {
  return typeof component === 'function' ? component(props) : component;
}

function reactNodeFromSingleFieldOutProps(resolved: unknown): ReactNode {
  if (resolved === null || typeof resolved !== 'object') {
    return null;
  }

  const values = Object.values(resolved);

  if (values.length !== 1) {
    return null;
  }

  return values[0] as ReactNode;
}

function resolveComposableComponentName<
  Name extends string,
  Resource extends string,
  LayoutName extends string,
>(
  name: ComposableComponentName<Name, Resource, LayoutName>,
  ctx: ComposableNameContext<Resource, LayoutName>,
): Name {
  return typeof name === 'function' ? name(ctx) : name;
}

export function createLayoutComposableFactory<
  Resources extends string,
  LayoutName extends string,
>(ctx: ComposableNameContext<Resources, LayoutName>) {
  const create: CreateLayoutComposable<Resources, LayoutName> = <
    const Name extends string,
    Wrapper,
    InProps extends InPropsObject = {},
    OutProps = {},
  >(
    options: CreateComposableComponentOptions<
      Name,
      Wrapper,
      Resources,
      LayoutName,
      InProps,
      OutProps
    >,
  ) =>
    createComposableComponent({
      ...options,
      name: resolveComposableComponentName(options.name, ctx),
    } as ResolvedCreateComposableComponentOptions<
      Name,
      Wrapper,
      Resources,
      LayoutName,
      InProps,
      OutProps
    >);

  return create;
}

export function resolveLayoutComposables<
  Resources extends string,
  LayoutName extends string,
  Composables extends ComposableComponents,
>(
  factory: (
    create: CreateLayoutComposable<Resources, LayoutName>,
  ) => Composables,
  ctx: ComposableNameContext<Resources, LayoutName>,
): Composables {
  return factory(createLayoutComposableFactory(ctx));
}

export function createComposableComponent<
  const Name extends string,
  Wrapper,
  InProps extends InPropsObject = {},
  OutProps = {},
>(
  options: ResolvedCreateComposableComponentOptions<
    Name,
    Wrapper,
    string,
    string,
    InProps,
    OutProps
  >,
) {
  const { name, inProps = {} as InProps, outProps, wrapWith } = options;

  function Composable({
    children,
    ...props
  }: ComposableComponentProps<Wrapper, InProps, OutProps>) {
    const inPropsKeys = Object.keys(inProps as object) as (keyof InProps &
      string)[];
    const mergedInProps = {
      ...inProps,
    };
    const propsRecord = props as Record<string, unknown>;

    for (const key of inPropsKeys) {
      if (key in propsRecord) {
        (mergedInProps as Record<string, unknown>)[key] = propsRecord[key];
      }
    }

    const wrapperProps = {
      ...propsRecord,
    } as ComposableComponentWrapperProps<Wrapper>;

    for (const key of inPropsKeys) {
      delete (wrapperProps as Record<string, unknown>)[key];
    }

    const mergedValues = resolvePropDefinitionValues(
      mergedInProps as Record<string, unknown>,
    );
    const alreadyValidated = (options as unknown as Record<symbol, unknown>)[
      validatedInPropsObject
    ];
    const mergedResolved = validateProps(
      alreadyValidated ? {} : inProps,
      mergedValues,
    ) as Show<ResolveProps<InProps>>;

    const resolvedProps = outProps
      ? outProps(mergedResolved)
      : ({} as OutProps);
    const resolvedChildren =
      children == null
        ? reactNodeFromSingleFieldOutProps(resolvedProps)
        : resolveComponent(children, resolvedProps);

    if (wrapWith) {
      const Comp = wrapWith as ComponentType<
        ComposableComponentWrapperProps<Wrapper>
      >;

      return <Comp {...wrapperProps}>{resolvedChildren}</Comp>;
    }

    // A single intrinsic child is the composable's root without adding a wrapper.
    if (
      propsRecord['data-rl-node'] &&
      isValidElement(resolvedChildren) &&
      typeof resolvedChildren.type === 'string'
    ) {
      return cloneElement(resolvedChildren, {
        'data-rl-node': propsRecord['data-rl-node'],
        'data-rl-composable': propsRecord['data-rl-composable'],
        'data-rl-owners': propsRecord['data-rl-owners'],
      } as Record<string, unknown>);
    }

    return resolvedChildren;
  }

  Composable.displayName = name;

  const debugKey = Symbol.for('@jfdevelops/react-layout/debug');
  const debug = (options as unknown as Record<symbol, unknown>)[debugKey];

  return Object.assign(Composable, {
    ...(debug
      ? {
          [debugKey]: debug,
        }
      : {}),
    props: undefined as unknown as ResolveProps<InProps>,
  }) as unknown as ComposableComponent<Name, Wrapper, InProps, OutProps>;
}

type DefineComposableComponentOptions<
  Name extends string,
  Props extends InPropsObject,
  Wrapper = undefined,
> = {
  name: Name;
  props?: Props;
  wrapWith?: Wrapper;
};

export type DefinedComposableComponentRecord<
  Name extends string,
  Props extends InPropsObject = {},
  Wrapper = undefined,
> = {
  [K in Name]: ComposablePresetComponent<Name, Props, Wrapper>;
};

/** A new name for a prop, or a new name together with a new definition. */
export type PropRename =
  | string
  | {
      name: string;
      schema: PropDefinition;
    };

/** New names for a defined composable's props, keyed by their current names. */
export type PropRenames<Props extends InPropsObject> = {
  [Key in keyof Props]?: PropRename;
};

type RenamedPropName<Key, Rename> = Rename extends string
  ? Rename
  : Rename extends { name: infer Name extends string }
    ? Name
    : Key;

type RenamedPropDefinition<Definition, Rename> = Rename extends {
  schema: infer Schema extends PropDefinition;
}
  ? Schema
  : Definition;

/** Applies a rename map to a defined composable's prop definitions. */
export type RenameProps<Props extends InPropsObject, Renames> = [
  keyof Renames,
] extends [never]
  ? Props
  : {
      [
        Key in keyof Props as Key extends keyof Renames
          ? RenamedPropName<Key, Renames[Key]>
          : Key
      ]: Key extends keyof Renames
        ? RenamedPropDefinition<Props[Key], Renames[Key]>
        : Props[Key];
    };

type CustomizedProps<Props extends InPropsObject, Renames, Overrides> = Omit<
  RenameProps<Props, Renames>,
  keyof Overrides
> &
  Overrides;

// Lists the default props so an editor suggests them, and allows new ones.
type PropOverrides<Props extends InPropsObject> = {
  [Key in keyof Props]?: PropDefinition;
} & InPropsObject;

type CustomizeComposableOptions<
  Props extends InPropsObject,
  Renames,
  Overrides,
  CustomName extends string,
  CustomWrapper,
> = {
  name?: CustomName;
  /**
   * Rename default props. A string keeps the definition; an object also
   * replaces it.
   */
  rename?: Renames & PropRenames<Props>;
  /**
   * Replace default props or add new ones. A function receives the defaults.
   */
  props?: (Overrides & PropOverrides<Props>) | ((defaults: Props) => Overrides);
  wrapWith?: CustomWrapper;
};

export type DefinedComposableComponentFactory<
  Name extends string,
  Props extends InPropsObject,
  Wrapper = undefined,
> = {
  props: Props;
  /**
   * Customize this instance without changing the factory's defaults.
   */
  <
    const Overrides extends InPropsObject = {},
    const CustomName extends string = Name,
    CustomWrapper = Wrapper,
    const Renames extends PropRenames<Props> = {},
  >(
    options: CustomizeComposableOptions<
      Props,
      Renames,
      Overrides,
      CustomName,
      CustomWrapper
    > & {
      render: (
        props: Show<
          WithChildren<ResolveProps<CustomizedProps<Props, Renames, Overrides>>>
        >,
      ) => ReactNode;
    },
  ): DefinedComposableComponentRecord<
    CustomName,
    CustomizedProps<Props, Renames, Overrides>,
    CustomWrapper
  >;
  (
    render: (props: Show<WithChildren<ResolveProps<Props>>>) => ReactNode,
  ): DefinedComposableComponentRecord<Name, Props, Wrapper>;
  /**
   * Derive a factory with its own name, props, or wrapper. The original
   * factory is unchanged.
   */
  extend<
    const Renames extends PropRenames<Props> = {},
    const Overrides extends InPropsObject = {},
    const CustomName extends string = Name,
    CustomWrapper = Wrapper,
  >(
    options: CustomizeComposableOptions<
      Props,
      Renames,
      Overrides,
      CustomName,
      CustomWrapper
    >,
  ): DefinedComposableComponentFactory<
    CustomName,
    CustomizedProps<Props, Renames, Overrides>,
    CustomWrapper
  >;
};

function getRenamedName(prop: string, rename: PropRename | undefined) {
  if (rename === undefined) {
    return prop;
  }

  return typeof rename === 'string' ? rename : rename.name;
}

function renamePropDefinitions(
  composable: string,
  props: InPropsObject,
  renames: Record<string, PropRename | undefined>,
) {
  for (const prop of Object.keys(renames)) {
    if (renames[prop] !== undefined && !Object.hasOwn(props, prop)) {
      throw new InvalidPropRenameError({
        composable,
        prop,
        name: getRenamedName(prop, renames[prop]),
        reason: 'unknown',
      });
    }
  }

  const renamed: InPropsObject = {};

  for (const [prop, definition] of Object.entries(props)) {
    const rename = renames[prop];
    const name = getRenamedName(prop, rename);

    if (rename !== undefined && name === 'children') {
      throw new InvalidPropRenameError({
        composable,
        prop,
        name,
        reason: 'reserved',
      });
    }

    if (Object.hasOwn(renamed, name)) {
      throw new InvalidPropRenameError({
        composable,
        prop,
        name,
        reason: 'duplicate',
      });
    }

    renamed[name] =
      rename !== undefined && typeof rename !== 'string'
        ? rename.schema
        : definition;
  }

  return renamed;
}

function resolvePresetComposableCallProps<Props extends InPropsObject>(
  presetKey: string,
  propDefinitions: Props,
  callProps: Record<string, unknown>,
) {
  const presetKeys = Object.keys(propDefinitions) as (keyof Props & string)[];
  const contextValues = useComposablePresetProps(presetKey) ?? {};
  const presetValues = Object.fromEntries(
    presetKeys.map((key) => [
      key,
      Object.hasOwn(callProps, key) ? callProps[key] : contextValues[key],
    ]),
  );
  // Context values have already been validated by the owning layout.
  const definitions = Object.fromEntries(
    Object.entries(propDefinitions).filter(
      ([key]) =>
        Object.hasOwn(callProps, key) || !Object.hasOwn(contextValues, key),
    ),
  );

  return validateProps(definitions, presetValues) as Show<
    WithChildren<ResolveProps<Props>>
  >;
}

export function defineComposableComponent<
  const Name extends string,
  Props extends InPropsObject = {},
  Wrapper = undefined,
>(
  options: DefineComposableComponentOptions<Name, Props, Wrapper>,
): DefinedComposableComponentFactory<Name, Props, Wrapper> {
  const { name, props = {} as Props, wrapWith } = options;

  function extend(customization: {
    name?: string;
    rename?: Record<string, PropRename | undefined>;
    props?: InPropsObject | ((defaults: Props) => InPropsObject);
    wrapWith?: unknown;
  }) {
    const customName = customization.name ?? name;
    const overrides =
      typeof customization.props === 'function'
        ? customization.props(props)
        : customization.props;

    return defineComposableComponent({
      ...options,
      name: customName,
      props: {
        ...renamePropDefinitions(customName, props, customization.rename ?? {}),
        ...overrides,
      },
      wrapWith: 'wrapWith' in customization ? customization.wrapWith : wrapWith,
    });
  }

  const factory = (
    definition:
      | ((props: Show<WithChildren<ResolveProps<Props>>>) => ReactNode)
      | {
          name?: string;
          rename?: Record<string, PropRename | undefined>;
          props?: InPropsObject | ((defaults: Props) => InPropsObject);
          wrapWith?: unknown;
          render: (props: any) => ReactNode;
        },
  ): DefinedComposableComponentRecord<Name, Props, Wrapper> => {
    if (typeof definition !== 'function') {
      const { render: customRender, ...customization } = definition;

      return extend(customization)(
        customRender,
      ) as unknown as DefinedComposableComponentRecord<Name, Props, Wrapper>;
    }

    const render = definition;
    const component = createComposableComponent<
      Name,
      Wrapper,
      Props,
      Show<WithChildren<ResolveProps<Props>>>
    >({
      name,
      wrapWith,
      inProps: props,
      outProps: (resolved) => resolved as never,
      ...{
        [validatedInPropsObject]: true,
      },
    });

    function PresetComposable(
      callProps: ComposablePresetComponentCallProps<Props, Wrapper>,
    ) {
      const callPropsRecord = callProps as Record<string, unknown>;
      const presetKeys = Object.keys(props) as (keyof Props & string)[];
      const validatedPresetProps = resolvePresetComposableCallProps(
        name,
        props,
        callPropsRecord,
      );
      const wrapperProps = {
        ...callPropsRecord,
      };

      for (const key of presetKeys) {
        delete wrapperProps[key];
      }

      return component({
        ...(wrapperProps as ComposableComponentWrapperProps<Wrapper>),
        ...validatedPresetProps,
        children: (resolved: Show<WithChildren<ResolveProps<Props>>>) =>
          render({
            ...resolved,
            children:
              'children' in props
                ? (validatedPresetProps as Record<string, unknown>).children
                : callPropsRecord.children,
          } as Show<WithChildren<ResolveProps<Props>>>),
      } as unknown as ComposableComponentProps<
        Wrapper,
        Props,
        Show<WithChildren<ResolveProps<Props>>>
      >);
    }

    PresetComposable.displayName = name;

    const debugKey = Symbol.for('@jfdevelops/react-layout/debug');
    const debug = (options as unknown as Record<symbol, unknown>)[debugKey];
    const presetComponent = Object.assign(PresetComposable, {
      ...(debug
        ? {
            [debugKey]: debug,
          }
        : {}),
      props: undefined as unknown as Show<WithChildren<ResolveProps<Props>>>,
      [composablePresetMetaKey]: {
        key: name,
        props,
      } satisfies ComposablePresetMeta<Props>,
    }) as unknown as DefinedComposableComponentRecord<
      Name,
      Props,
      Wrapper
    >[Name];

    return {
      [name]: presetComponent,
    } as DefinedComposableComponentRecord<Name, Props, Wrapper>;
  };

  Object.defineProperty(factory, 'props', {
    enumerable: true,
    value: props,
  });
  Object.defineProperty(factory, 'extend', {
    value: extend,
  });

  return factory as DefinedComposableComponentFactory<Name, Props, Wrapper>;
}

export type MakeComposableOptions<
  Composables extends ComposableComponents,
  Name extends string,
> = {
  components: Composables | undefined;
  name: Name;
};

export type MakeComposable<
  Composables extends ComposableComponents,
  Name extends string,
> = <OverrideName extends string = Name>(
  options?: Partial<
    Pick<MakeComposableOptions<Composables, OverrideName>, 'name'>
  >,
) => ComposableResourceLayout<Composables, Name, any, any, any>;

export function makeComposable<Props>() {
  return function <
    Composables extends ComposableComponents,
    Name extends string,
  >(options: MakeComposableOptions<Composables, Name>) {
    const { components, name: layoutName } = options;

    if (!components || typeof components !== 'object') {
      throw new InvalidComponentsError('components must be an object');
    }

    const componentNames = Object.keys(components);

    if (componentNames.length === 0) {
      throw new EmptyComponentsError(
        'components must have at least one component',
      );
    }

    const create: MakeComposable<Composables, Name> = (overrideOptions) => {
      const resolvedName = overrideOptions?.name ?? layoutName;
      const { Layout, ...rest } = components;

      return Object.assign(Layout, {
        displayName: resolvedName,
        props: undefined as unknown as Props,
        ...rest,
      }) as unknown as ComposableResourceLayout<
        Composables,
        Name,
        any,
        any,
        any
      >;
    };

    return create;
  };
}
