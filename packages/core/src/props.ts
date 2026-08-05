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
/**
 * A map of props to include in the layout.
 */
export type IncludedProps<T extends object> = {
  [K in keyof T & string]?: PropsType;
};

type PropsKeys<Props extends InPropsObject, T> = T & keyof Props;
type GetPropsKey<IncludeProps extends object, Type extends PropsType = true> = {
  [key in keyof IncludeProps]: IncludeProps[key] extends Type ? key : never;
}[keyof IncludeProps];
type SelectedIncludedProps<
  Props extends InPropsObject,
  IncludeProps extends IncludedProps<Props>,
  Type extends InternalPropsType,
> = Pick<
  Props,
  PropsKeys<
    Props,
    GetPropsKey<IncludeProps, Type extends 'required' ? true : 'optional'>
  >
>;

export type ResolvedIncludedProps<
  Props extends InPropsObject,
  IncludeProps extends IncludedProps<Props>,
> = ResolveLayoutProps<SelectedIncludedProps<Props, IncludeProps, 'required'>> &
  Partial<
    ResolveLayoutProps<SelectedIncludedProps<Props, IncludeProps, 'optional'>>
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
