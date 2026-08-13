import type {
  ComposableComponents,
  MergePresetProps,
} from '@jfdevelops/react-layout-composables';
import type { InPropsObject } from '@jfdevelops/react-layout-composables';
import {
  EnumWrappedProp,
  LiteralWrappedProp,
  ResolveLayoutProps,
  ResolveLayoutPropsAsDefined,
  ResolveProps,
} from '@jfdevelops/react-layout-validator';
import { ResourceDefinition, ResourceEnum } from './resource';
import { Show } from './utils';

export type { InPropsObject };

/**
 * Two-argument `render(props, context)` used by createComponent and scoped
 * resource components. `Context` is sibling components (scoped) or the
 * resource render context (top-level).
 */
export type PropsContextRender<RenderProps, Context, Result = unknown> = (
  props: RenderProps,
  context: Context,
) => Result;

/**
 * Shared `{ props?, render }` shape used by createComponent, scoped
 * components, and anywhere else a value declares props and a two-arg render.
 *
 * @typeParam Props - Declared on the entry (`props`). Often an
 *   {@link InPropsObject}, or a layout include/custom bag.
 * @typeParam RenderProps - First argument to `render` (defaults to
 *   {@link ResolveProps}<Props> when Props is an {@link InPropsObject})
 * @typeParam Result - `render` return type
 * @typeParam Context - Second argument to `render`
 */
export interface PropsRenderDefinition<
  Props = InPropsObject,
  RenderProps = Props extends InPropsObject ? ResolveProps<Props> : unknown,
  Result = unknown,
  Context = unknown,
> {
  props?: Props;
  render: PropsContextRender<RenderProps, Context, Result>;
}

export type InPropsOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Name extends string,
> = {
  name: LiteralWrappedProp<Name, 'string', 'required'>;
  resource: EnumWrappedProp<ResourceEnum<Resources>, 'string', 'required'>;
};
export type InPropsFunction<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = <Name extends string>(
  props: Show<InPropsOptions<Resources, Name>>,
) => InPropsObject;
export type InPropsDefinition<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = InPropsObject | InPropsFunction<Resources>;
export type InferredInProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
> = Options extends InPropsFunction<Resources> ? ReturnType<Options> : Options;
export type MergedLayoutInProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
> =
  InferredInProps<Resources, Options> extends InPropsObject
    ? InferredInProps<Resources, Options> & MergePresetProps<Composables>
    : never;
export type RequiredVariant = true | 'required';
/**
 * @typeParam RequiredVariant How the required props are selected. In application code,
 * it will always be `true`, but internally we need to support `'required'` as well.
 */
type PropsType<Variant extends RequiredVariant = true> = Variant | 'optional';
type InternalPropsType = PropsType<'required'>;
/** Controls where an included layout prop is supplied and whether it is required there. */
export type IncludedPropBehavior = {
  visibility: 'optional' | 'required';
  passthrough: 'component' | 'config';
};

type IncludedPropType = PropsType | IncludedPropBehavior;
/**
 * A map of props to include in the layout.
 */
export type IncludedProps<T extends object> = {
  [K in keyof T & string]?: IncludedPropType;
};

type PropsKeys<Props extends InPropsObject, T> = T & keyof Props;
type IncludedPropVisibility<Value> = Value extends IncludedPropBehavior
  ? Value['visibility']
  : Value extends true | 'required'
    ? 'required'
    : Value extends 'optional'
      ? 'optional'
      : never;
type IncludedPropPassthrough<Value> = Value extends IncludedPropBehavior
  ? Value['passthrough']
  : Value extends true | 'required'
    ? 'config'
    : Value extends 'optional'
      ? 'component' | 'config'
      : never;
type GetPropsKey<
  IncludeProps extends object,
  Visibility extends InternalPropsType,
  Passthrough extends IncludedPropBehavior['passthrough'] | 'render' = 'render',
> = {
  [Key in keyof IncludeProps]: IncludedPropVisibility<
    IncludeProps[Key]
  > extends Visibility
    ? Passthrough extends 'render'
      ? Key
      : Passthrough extends IncludedPropPassthrough<IncludeProps[Key]>
        ? Key
        : never
    : never;
}[keyof IncludeProps];
type SelectedIncludedProps<
  Props extends InPropsObject,
  IncludeProps extends IncludedProps<Props>,
  Visibility extends InternalPropsType,
  Passthrough extends IncludedPropBehavior['passthrough'] | 'render' = 'render',
> = Pick<
  Props,
  PropsKeys<Props, GetPropsKey<IncludeProps, Visibility, Passthrough>>
>;

export type ResolvedIncludedProps<
  Props extends InPropsObject,
  IncludeProps extends IncludedProps<Props>,
> = ResolveLayoutProps<SelectedIncludedProps<Props, IncludeProps, 'required'>> &
  Partial<
    ResolveLayoutProps<SelectedIncludedProps<Props, IncludeProps, 'optional'>>
  >;

export type ResolvedIncludedConfigProps<
  Props extends InPropsObject,
  IncludeProps extends IncludedProps<Props>,
> = ResolveLayoutProps<
  SelectedIncludedProps<Props, IncludeProps, 'required', 'config'>
> &
  Partial<
    ResolveLayoutProps<
      SelectedIncludedProps<Props, IncludeProps, 'optional', 'config'>
    >
  >;

export type ResolvedIncludedComponentProps<
  Props extends InPropsObject,
  IncludeProps extends IncludedProps<Props>,
> = ResolveLayoutProps<
  SelectedIncludedProps<Props, IncludeProps, 'required', 'component'>
> &
  Partial<
    ResolveLayoutProps<
      SelectedIncludedProps<Props, IncludeProps, 'optional', 'component'>
    >
  >;

/**
 * Like {@link ResolvedIncludedProps}, but keeps included prop keys exactly as
 * declared (no `JSX.Element` capitalization).
 */
export type ResolvedIncludedPropsAsDefined<
  Props extends InPropsObject,
  IncludeProps extends IncludedProps<Props>,
> = ResolveLayoutPropsAsDefined<
  SelectedIncludedProps<Props, IncludeProps, 'required'>
> &
  Partial<
    ResolveLayoutPropsAsDefined<
      SelectedIncludedProps<Props, IncludeProps, 'optional'>
    >
  >;
export type LayoutRenderProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents = {},
  IncludeProps extends IncludedProps<
    MergedLayoutInProps<Resources, Options, Composables>
  > = {},
  CustomProps extends InPropsObject = {},
> = Show<
  ResolveProps<CustomProps> &
    ResolvedIncludedProps<
      MergedLayoutInProps<Resources, Options, Composables>,
      IncludeProps
    >
>;
