import {
  ComponentType,
  createContext,
  ReactNode,
  useContext,
} from 'react';
import {
  AnyBuiltPropDefinition,
  ResolveLayoutProps,
  ResolveProps,
  resolvePropDefinitionValues,
  validateProps,
} from '@jfdevelops/react-layout-validator';
import { InPropsObject } from './types';
import { BaseComponent, Show, UnionToIntersection } from './utils';
import { CapitalizeFn } from './utils/capitalize';

export const composablePresetMetaKey = Symbol.for(
  'view-map.composable-preset-meta',
);

export type ComposablePresetMeta<Props extends InPropsObject = InPropsObject> = {
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

  return Object.entries(composables).flatMap(([objectKey, component]) => {
    const meta = (component as ComposablePresetComponent)[composablePresetMetaKey];

    if (!meta) {
      return [];
    }

    return [
      {
        key: meta.key ?? objectKey,
        props: meta.props,
      },
    ];
  });
}

export function resolveComposablePresetProps(
  composables: ComposableComponents | undefined,
  layoutOptions: Record<string, unknown>,
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
      props as Record<string, AnyBuiltPropDefinition>,
      values,
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
  (keyof InProps extends never ? {} : ResolveProps<InProps>) & {
    children?: [keyof InProps] extends [never]
      ? ReactNode
      : ((props: OutProps) => JSX.Element) | ReactNode;
  };
export type ComposableComponent<
  Name extends string,
  Wrapper,
  InProps extends InPropsObject = {},
  OutProps = {},
> = BaseComponent<Name, ResolveProps<InProps>> & {
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
export type PresetPropsFromComposable<Component> =
  Component extends {
    [composablePresetMetaKey]: ComposablePresetMeta<infer Props>;
  }
    ? Props
    : {};

export type MergePresetProps<Composables extends ComposableComponents> = Show<
  UnionToIntersection<
    PresetPropsFromComposable<Composables[keyof Composables]>
  >
>;

export type RequiredPresetRenderProps<Props extends InPropsObject> = {
  [K in keyof ResolveProps<Props> & string]-?: ResolveProps<Props>[K];
};

export type ComposablePresetComponentCallProps<
  Props extends InPropsObject,
  Wrapper = undefined,
> = RequiredPresetRenderProps<Props> &
  (Wrapper extends undefined
    ? {}
    : ComposableComponentWrapperProps<Wrapper>);

export type ComposablePresetComponent<
  Name extends string = string,
  Props extends InPropsObject = InPropsObject,
  Wrapper = undefined,
> = BaseComponent<Name, Show<ResolveProps<Props>>> & {
  [composablePresetMetaKey]: ComposablePresetMeta<Props>;
} & ((
  props: ComposablePresetComponentCallProps<Props, Wrapper>,
) => ReactNode);

type PresetPropDefinitions<Composables extends ComposableComponents> =
  MergePresetProps<Composables> extends InPropsObject
    ? MergePresetProps<Composables>
    : {};

export type RequiredPresetLayoutProps<
  Composables extends ComposableComponents,
> = {
  [K in keyof ResolveLayoutProps<
    PresetPropDefinitions<Composables>
  > &
    string]-?: ResolveLayoutProps<PresetPropDefinitions<Composables>>[K];
};
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
  const hasProps = Object.keys(props as object).length > 0;

  if (hasProps) {
    return typeof component === 'function' ? component(props) : component;
  }

  return component as ReactNode;
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
    const mergedInProps = { ...inProps };
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

    const mergedResolved = resolvePropDefinitionValues(
      mergedInProps as Record<string, unknown>,
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

    return resolvedChildren;
  }

  Composable.displayName = name;

  return Object.assign(Composable, {
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

type DefinedComposableComponentFactory<
  Name extends string,
  Props extends InPropsObject,
  Wrapper = undefined,
> = {
  props: Props;
  (
    render: (props: Show<ResolveProps<Props>>) => ReactNode,
  ): DefinedComposableComponentRecord<Name, Props, Wrapper>;
};

function resolvePresetComposableCallProps<Props extends InPropsObject>(
  presetKey: string,
  propDefinitions: Props,
  callProps: Record<string, unknown>,
) {
  const presetKeys = Object.keys(propDefinitions) as (keyof Props & string)[];
  const contextValues = useComposablePresetProps(presetKey) ?? {};
  const presetValues = Object.fromEntries(
    presetKeys.map((key) => [key, callProps[key] ?? contextValues[key]]),
  );

  return validateProps(
    propDefinitions as Record<string, AnyBuiltPropDefinition>,
    presetValues,
  ) as Show<ResolveProps<Props>>;
}

export function defineComposableComponent<
  const Name extends string,
  Props extends InPropsObject = {},
  Wrapper = undefined,
>(
  options: DefineComposableComponentOptions<Name, Props, Wrapper>,
): DefinedComposableComponentFactory<Name, Props, Wrapper> {
  const { name, props = {} as Props, wrapWith } = options;

  const factory = (
    render: (props: Show<ResolveProps<Props>>) => ReactNode,
  ): DefinedComposableComponentRecord<Name, Props, Wrapper> => {
    const component = createComposableComponent<
      Name,
      Wrapper,
      Props,
      Show<ResolveProps<Props>>
    >({
      name,
      wrapWith,
      inProps: props,
      outProps: (resolved) => resolved,
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
      const wrapperProps = { ...callPropsRecord };

      for (const key of presetKeys) {
        delete wrapperProps[key];
      }

      return component({
        ...(wrapperProps as ComposableComponentWrapperProps<Wrapper>),
        ...validatedPresetProps,
        children: render,
      } as unknown as ComposableComponentProps<
        Wrapper,
        Props,
        Show<ResolveProps<Props>>
      >);
    }

    PresetComposable.displayName = name;

    const presetComponent = Object.assign(PresetComposable, {
      props: undefined as unknown as Show<ResolveProps<Props>>,
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

  return factory as DefinedComposableComponentFactory<Name, Props, Wrapper>;
}

export type MakeComposableOptions<
  Composables extends ComposableComponents,
  Name extends string,
> = { components: Composables | undefined; name: Name };
export type MakeComposable<
  Composables extends ComposableComponents,
  Name extends string,
  Defined extends MakeComposableOptions<Composables, Name> = MakeComposableOptions<
    Composables,
    Name
  >,
  Props = unknown,
> = (
  overrideOptions?: Partial<Defined>,
) => Omit<
  ComposableResourceLayout<Composables, Name, any, any, any>,
  'props'
> &
  BaseComponent<Name, Props>;
export type MakeComposableFactory<Props = unknown> = <
  Composables extends ComposableComponents,
  Name extends string,
  const Defined extends MakeComposableOptions<Composables, Name>,
>(
  options: Defined,
) => MakeComposable<Composables, Name, Defined, Props>;

export function makeComposable<Props>(): MakeComposableFactory<Props> {
  return function <
    Composables extends ComposableComponents,
    Name extends string,
    const Defined extends MakeComposableOptions<Composables, Name>,
  >(options: Defined) {
    const { components, name: layoutName } = options;

    if (!components || typeof components !== 'object') {
      throw new Error('components must be an object');
    }

    const componentNames = Object.keys(components);

    if (componentNames.length === 0) {
      throw new Error('components must have at least one component');
    }

    // if (!('Layout' in components)) {
    //   throw new Error('The Layout composable is required');
    // }

    const create: MakeComposable<Composables, Name, Defined, Props> = (
      overrideOptions,
    ) => {
      const resolvedName = overrideOptions?.name ?? layoutName;
      const resolvedComponents = overrideOptions?.components ?? components;
      const { Layout, ...rest } = resolvedComponents;

      return Object.assign(Layout, {
        displayName: resolvedName,
        props: undefined as unknown as Props,
        ...rest,
      }) as unknown as ReturnType<MakeComposable<Composables, Name, Defined, Props>>;
    };

    return create;
  };
}
