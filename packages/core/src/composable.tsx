import { ComponentType, ReactNode } from 'react';
import { AnyBuiltPropDefinition, ResolveProps } from './create-value';
import { InPropsObject } from './props';
import { BaseComponent, Show } from './utils';

type CreateComposableComponentOptions<
  Name extends string,
  Wrapper,
  InProps extends InPropsObject = {},
  OutProps = {},
> = {
  name: Name;
  inProps?: InProps;
  outProps?: (props: Show<ResolveProps<InProps>>) => OutProps;
  wrapWith?: Wrapper;
};
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

export type AnyComposableComponent = ComposableComponent<string, any, any, any>;
export type ComposableComponents = Record<string, AnyComposableComponent>;
export type ResolvedComposableComponents<
  Components extends ComposableComponents,
> = [keyof Components] extends [never]
  ? never
  : Components extends { Layout: infer _ }
    ? Components
    : 'The Layout composable is required';

function isPropsDefinitionShape(v: unknown): v is AnyBuiltPropDefinition {
  return typeof v === 'function' && v !== null && 'visibility' in v;
}

/**
 * Shallow-unwrap page prop descriptors so render callbacks never receive
 * prop definition objects.
 */
function resolveOptionalDefinitionValuesInProps(
  input: Record<string, unknown>,
) {
  const out: Record<string, unknown> = {};

  for (const key of Object.keys(input)) {
    const v = input[key];
    out[key] = isPropsDefinitionShape(v)
      ? (v as AnyBuiltPropDefinition & { _baseProp?: { value?: unknown } })
          ._baseProp?.value
      : v;
  }

  return out;
}

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

export function createComposableComponent<
  const Name extends string,
  Wrapper,
  InProps extends InPropsObject = {},
  OutProps = {},
>(options: CreateComposableComponentOptions<Name, Wrapper, InProps, OutProps>) {
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

    const mergedResolved = resolveOptionalDefinitionValuesInProps(
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

export type MakeComposableOptions<
  Composables extends ComposableComponents,
  Name extends string,
> = { components: Composables | undefined; name: Name };
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
      throw new Error('components must be an object');
    }

    const componentNames = Object.keys(components);

    if (componentNames.length === 0) {
      throw new Error('components must have at least one component');
    }

    if (!('Layout' in components)) {
      throw new Error('The Layout composable is required');
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
