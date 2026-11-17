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
  type NormalizePropDefinitions,
  PropDefinition,
  type PropValidationContext,
  type PropValidator,
  ResolveProps,
  ResolveInputProps,
  type StandardSchemaV1,
  resolvePropDefinitionValues,
  validateProps,
} from '@jfdevelops/react-layout-validator';
import {
  type ComposableProps,
  type ComposablePropDefinition,
  type ComposablePropsInput,
  type NormalizeComposableProps,
  normalizeComposableProps,
} from './custom-props';
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

const validatedComposableProps = Symbol('validatedComposableProps');

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
      validatedComposableProps
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
  Props extends ComposableProps,
  Wrapper = undefined,
> = {
  name: Name;
  /**
   * The composable's custom props. This is the same object as `props.custom`
   * elsewhere in the library; a composable has no shared options to
   * `include`, so the `custom` key is left out. Each prop is a Standard
   * Schema or an inline validator, and `children: 'required'` is accepted.
   */
  props?: Props & ComposableProps & ComposablePropsInput<Props>;
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
      schema: PropDefinition | PropValidator;
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
  schema: infer Schema;
}
  ? Schema extends PropDefinition
    ? Schema
    : NormalizePropDefinitions<{
        schema: Schema;
      }>['schema']
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
  NormalizeComposableProps<Overrides>;

// Lists the default props so an editor suggests them, and allows new ones.
type PropOverrides<Props extends InPropsObject> = {
  [Key in keyof Props]?: ComposablePropDefinition;
} & ComposableProps;

// Options every defined composable accepts; a context value cannot use them.
type ReservedComposableOption =
  | 'name'
  | 'props'
  | 'rename'
  | 'render'
  | 'wrapWith';

// A default such as `['a', 'b'] as const` only shows the kind of value, so its
// literals widen: a caller may supply any value of that kind.
type WidenContextValue<Value> = Value extends string
  ? string
  : Value extends number
    ? number
    : Value extends boolean
      ? boolean
      : Value extends bigint
        ? bigint
        : Value extends (...input: never[]) => unknown
          ? Value
          : Value extends ReadonlyArray<infer Item>
            ? ReadonlyArray<WidenContextValue<Item>>
            : Value extends object
              ? {
                  [Key in keyof Value]: WidenContextValue<Value[Key]>;
                }
              : Value;

/**
 * The context values a defined composable works with, typed from the
 * defaults it declares.
 */
export type ComposableContextValues<Defaults> = {
  [Key in keyof Defaults]: WidenContextValue<Defaults[Key]>;
};

/** One value a caller may change where a defined composable is used. */
export type ComposableContextEntry<Value> = {
  /**
   * The value used when the caller supplies none.
   */
  value: Value;
  /**
   * Decides the value to use from the default and what the caller supplied.
   * Without it, a supplied value replaces the default.
   */
  handler?: (input: {
    value: WidenContextValue<Value>;
    supplied: WidenContextValue<Value>;
  }) => WidenContextValue<Value>;
};

/** The context entries of a defined composable, keyed by option name. */
export type ComposableContextEntries<Values> = {
  [Key in keyof Values]: Key extends ReservedComposableOption
    ? never
    : ComposableContextEntry<Values[Key]>;
};

/**
 * What a caller may pass for each context value: the value itself, or a
 * function that receives the default and returns the value.
 */
export type ComposableContextOptions<Context> = {
  [Key in keyof Context]?:
    | Context[Key]
    | ((value: Context[Key]) => Context[Key]);
};

type CustomizeComposableOptions<
  Props extends InPropsObject,
  Renames,
  Overrides,
  CustomName extends string,
  CustomWrapper,
  Context = {},
> = ComposableContextOptions<Context> & {
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
  Context = {},
> = {
  props: Props;
  /**
   * Customize this instance without changing the factory's defaults.
   */
  <
    const Overrides extends ComposableProps = {},
    const CustomName extends string = Name,
    CustomWrapper = Wrapper,
    const Renames extends PropRenames<Props> = {},
  >(
    options: CustomizeComposableOptions<
      Props,
      Renames,
      Overrides,
      CustomName,
      CustomWrapper,
      Context
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
    const Overrides extends ComposableProps = {},
    const CustomName extends string = Name,
    CustomWrapper = Wrapper,
  >(
    options: CustomizeComposableOptions<
      Props,
      Renames,
      Overrides,
      CustomName,
      CustomWrapper,
      Context
    >,
  ): DefinedComposableComponentFactory<
    CustomName,
    CustomizedProps<Props, Renames, Overrides>,
    CustomWrapper
  >;
};

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
        name: prop,
        reason: 'unknown',
      });
    }
  }

  const renamed: ComposableProps = {};

  for (const [prop, definition] of Object.entries(props)) {
    const rename = renames[prop];
    const name =
      rename === undefined
        ? prop
        : typeof rename === 'string'
          ? rename
          : rename.name;

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
  Definitions extends ComposableProps = {},
  Wrapper = undefined,
>(
  options: DefineComposableComponentOptions<Name, Definitions, Wrapper>,
): DefinedComposableComponentFactory<
  Name,
  NormalizeComposableProps<Definitions>,
  Wrapper
>;

export function defineComposableComponent<
  const Name extends string,
  Props extends InPropsObject = {},
  Wrapper = undefined,
>(
  options: DefineComposableComponentOptions<Name, Props, Wrapper>,
): DefinedComposableComponentFactory<Name, Props, Wrapper> {
  const { name, wrapWith } = options;
  // Inline validators become definitions once, so every composable derived
  // from this factory shares them.
  const props = normalizeComposableProps(options.props ?? {}) as Props;

  function extend(customization: {
    name?: string;
    rename?: Record<string, PropRename | undefined>;
    props?: ComposableProps | ((defaults: Props) => ComposableProps);
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
      // Already-checked definitions; the checked input type is for callers.
      props: {
        ...renamePropDefinitions(customName, props, customization.rename ?? {}),
        ...overrides,
      } as {},
      wrapWith: 'wrapWith' in customization ? customization.wrapWith : wrapWith,
    });
  }

  const factory = (
    definition:
      | ((props: Show<WithChildren<ResolveProps<Props>>>) => ReactNode)
      | {
          name?: string;
          rename?: Record<string, PropRename | undefined>;
          props?: ComposableProps | ((defaults: Props) => ComposableProps);
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
        [validatedComposableProps]: true,
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

function resolveComposableContext(
  entries: Record<string, ComposableContextEntry<unknown>>,
  options: Record<string, unknown>,
) {
  const rest = {
    ...options,
  };
  let isCustomized = false;
  const values = Object.fromEntries(
    Object.entries(entries).map(([key, entry]) => {
      if (!Object.hasOwn(options, key) || options[key] === undefined) {
        return [key, entry.value];
      }

      const option = options[key];
      // A function is how a caller derives its value from the default.
      const supplied =
        typeof option === 'function' ? option(entry.value) : option;

      delete rest[key];
      isCustomized = true;

      return [
        key,
        entry.handler
          ? entry.handler({
              value: entry.value,
              supplied,
            })
          : supplied,
      ];
    }),
  );

  return {
    isCustomized,
    rest,
    values,
  };
}

/**
 * Starts a defined composable whose definition depends on values a caller
 * may change. `handler` receives those values and returns the definition.
 */
function defineContext<Values extends Record<string, unknown>>(
  entries: ComposableContextEntries<Values>,
) {
  const contextEntries = entries as Record<
    string,
    ComposableContextEntry<unknown>
  >;

  return {
    /**
     * Defines the composable from the context values. It runs with the
     * defaults, and again for a caller that changes a value.
     */
    handler<
      const Name extends string,
      Definitions extends ComposableProps = {},
      Wrapper = undefined,
    >(
      define: (context: ComposableContextValues<Values>) => {
        name: Name;
        props?: Definitions & ComposableProps;
        wrapWith?: Wrapper;
      },
    ) {
      type Factory = DefinedComposableComponentFactory<
        Name,
        NormalizeComposableProps<Definitions>,
        Wrapper
      >;

      // The definition is checked where `handler` is called.
      function createFactory(values: Record<string, unknown>) {
        return defineComposableComponent(
          define(values as ComposableContextValues<Values>) as never,
        ) as unknown as Factory;
      }

      const base = createFactory(
        resolveComposableContext(contextEntries, {}).values,
      );

      // A customized call gets a factory defined from its own values.
      function select(options: Record<string, unknown>) {
        const { isCustomized, rest, values } = resolveComposableContext(
          contextEntries,
          options,
        );

        return {
          factory: isCustomized ? createFactory(values) : base,
          rest,
        };
      }

      const contextual = (definition: unknown) => {
        if (typeof definition === 'function') {
          return base(definition as never);
        }

        const { factory, rest } = select(definition as Record<string, unknown>);

        return factory(rest as never);
      };

      Object.defineProperty(contextual, 'props', {
        enumerable: true,
        value: base.props,
      });
      Object.defineProperty(contextual, 'extend', {
        value: (customization: Record<string, unknown>) => {
          const { factory, rest } = select(customization);

          return factory.extend(rest);
        },
      });

      return contextual as unknown as DefinedComposableComponentFactory<
        Name,
        NormalizeComposableProps<Definitions>,
        Wrapper,
        ComposableContextValues<Values>
      >;
    },
  };
}

defineComposableComponent.defineContext = defineContext;

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
