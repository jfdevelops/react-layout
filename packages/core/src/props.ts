import type { WithChildren } from '@jfdevelops/react-layout-composables';
import type { CustomPropsInput, CustomPropsObject, ResolveRenderProps } from './custom-props';
import { LayoutConfigurationError } from './errors';
import type { ComposableComponents, MergePresetProps } from '@jfdevelops/react-layout-composables';
import type { InPropsObject } from '@jfdevelops/react-layout-composables';
import {
  ResolveProps,
  ResolvePropsAsDefined,
  ResolveInputProps,
  type StandardSchemaV1,
} from '@jfdevelops/react-layout-validator';
import { ResourceDefinition, ResourceEnum } from './resource';
import { Show } from './utils';
import type { OptionSchema, SchemaOptionDefinitions } from './option-schema';

export type { InPropsObject };

/** Shared include/custom contract used by configurable layout helpers. */
export interface PropsContract<
  IncludeProps extends object = object,
  CustomProps extends object = object,
> {
  /**
   * Shared options and preset props to include, keyed by prop name.
   */
  include?: IncludeProps;
  /**
   * Custom props that the layout, state, or component will receive.
   */
  custom?: CustomProps;
}

/**
 * A {@link PropsContract} whose custom props are checked as prop definitions;
 * string requirements are reserved for the built-in `children` slot.
 */
export interface TypedPropsContract<
  IncludeProps extends object,
  CustomProps extends CustomPropsObject,
> extends PropsContract<IncludeProps, CustomProps & CustomPropsInput<CustomProps>> {}

/**
 * The `{ props?, composables?, render }` block shared by layouts, shells, and
 * render states.
 */
export interface RenderDefinition<Props, Composables, Render> {
  /**
   * The props the block declares.
   */
  props?: Props;
  /**
   * Components composed by the block, created for each rendered instance.
   */
  composables?: Composables;
  /**
   * Renders the block.
   */
  render: Render;
}

/**
 * Two-argument `render(props, context)` used by createComponent and scoped
 * resource components. `Context` is sibling components (scoped) or the
 * resource render context (top-level).
 */
export type PropsContextRender<RenderProps, Context, Result = unknown> = (
  props: WithChildren<RenderProps>,
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

/** The definitions handed to `options` when it is declared as a function. */
export interface InPropsOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Name extends string,
> {
  /**
   * The created component's name. Including it supplies the name itself.
   */
  name: StandardSchemaV1<Name | undefined, Name>;
  /**
   * Accepts any resource bound to the definition.
   */
  resource: StandardSchemaV1<ResourceEnum<Resources>[number], ResourceEnum<Resources>[number]>;
}
export type InPropsFunction<Resources extends ReadonlyArray<ResourceDefinition>> = <
  Name extends string,
>(
  props: InPropsOptions<Resources, Name>,
) => InPropsObject;
/**
 * The options a definition declares: one object schema validated as a whole,
 * a map of schemas keyed by option name, or a function that builds that map
 * from the bound resources and the component name.
 */
export type InPropsDefinition<Resources extends ReadonlyArray<ResourceDefinition>> =
  | InPropsObject
  | OptionSchema
  | InPropsFunction<Resources>;
export type InferredInProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
> = Options extends OptionSchema
  ? SchemaOptionDefinitions<Options>
  : Options extends InPropsFunction<Resources>
    ? ReturnType<Options>
    : Options;
export type MergedLayoutInProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
> =
  InferredInProps<Resources, Options> extends infer Props extends InPropsObject
    ? Props & MergePresetProps<Composables>
    : never;
export type RequiredVariant = true | 'required';
/**
 * @typeParam RequiredVariant How the required props are selected. In application code,
 * it will always be `true`, but internally we need to support `'required'` as well.
 */
type PropsType<Variant extends RequiredVariant = true> = Variant | 'optional';
type InternalPropsType = PropsType<'required'>;
type IncludedPropSource = 'component' | 'config';
/** Controls whether an included prop is required and where it is supplied. */
export type IncludedPropBehavior = {
  required: boolean;
  suppliedVia: IncludedPropSource;
};

type IncludedPropType = PropsType | IncludedPropBehavior;
/**
 * A map of props to include in the layout.
 */
export type IncludedProps<T extends object> = {
  [K in keyof T & string]?: IncludedPropType;
};

/**
 * The include map accepted for a layout's merged options and preset props.
 */
export type LayoutIncludeProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents,
> = IncludedProps<MergedLayoutInProps<Resources, Options, Composables>>;

type PropsKeys<Props extends InPropsObject, T> = T & keyof Props;
export type IncludedPropVisibility<Value> = Value extends { required: boolean }
  ? Value['required'] extends true
    ? 'required'
    : 'optional'
  : Value extends true | 'required'
    ? 'required'
    : Value extends 'optional'
      ? 'optional'
      : never;
export type IncludedPropSupplySource<Value> = Value extends {
  suppliedVia: IncludedPropSource;
}
  ? Value['suppliedVia']
  : never;
/**
 * Internal representation of the supported include behavior.
 */
export type NormalizedIncludedPropBehavior<Value> = Value extends
  | { required: boolean }
  | { suppliedVia: IncludedPropSource }
  ? {
      visibility: IncludedPropVisibility<Value>;
      passthrough: IncludedPropSupplySource<Value>;
    }
  : Value;

export type IncludedPropPassthrough<Value> = Value extends
  | { required: boolean }
  | { suppliedVia: IncludedPropSource }
  ? IncludedPropSupplySource<Value> extends 'component'
    ? IncludedPropVisibility<Value> extends 'optional'
      ? 'component' | 'config'
      : 'component'
    : IncludedPropSupplySource<Value>
  : Value extends true | 'required'
    ? 'config'
    : Value extends 'optional'
      ? 'component' | 'config'
      : never;

type GetPropsKey<
  IncludeProps extends object,
  Visibility extends InternalPropsType,
  Passthrough extends IncludedPropSource | 'render' = 'render',
> = {
  [Key in keyof IncludeProps]: IncludedPropVisibility<IncludeProps[Key]> extends Visibility
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
  Passthrough extends IncludedPropSource | 'render' = 'render',
> = Pick<Props, PropsKeys<Props, GetPropsKey<IncludeProps, Visibility, Passthrough>>>;

type OptionalPropDefinition<Definition> = Definition extends StandardSchemaV1
  ? StandardSchemaV1<
      StandardSchemaV1.InferInput<Definition> | undefined,
      StandardSchemaV1.InferOutput<Definition> | undefined
    > &
      Pick<Definition, Extract<keyof Definition, symbol>>
  : Definition;

/** Raw validator definitions accepted by a generated component call. */
export type IncludedComponentPropDefinitions<
  Props extends InPropsObject,
  IncludeProps extends IncludedProps<Props>,
> = SelectedIncludedProps<Props, IncludeProps, 'required', 'component'> & {
  [
    Key in keyof SelectedIncludedProps<Props, IncludeProps, 'optional', 'component'>
  ]: OptionalPropDefinition<
    SelectedIncludedProps<Props, IncludeProps, 'optional', 'component'>[Key]
  >;
};

export type ResolvedIncludedProps<
  Props extends InPropsObject,
  IncludeProps extends IncludedProps<Props>,
> = ResolveProps<SelectedIncludedProps<Props, IncludeProps, 'required'>> &
  Partial<ResolveProps<SelectedIncludedProps<Props, IncludeProps, 'optional'>>>;

export type ResolvedIncludedConfigProps<
  Props extends InPropsObject,
  IncludeProps extends IncludedProps<Props>,
> = ResolveInputProps<SelectedIncludedProps<Props, IncludeProps, 'required', 'config'>> &
  Partial<ResolveInputProps<SelectedIncludedProps<Props, IncludeProps, 'optional', 'config'>>>;

export type ResolvedIncludedComponentProps<
  Props extends InPropsObject,
  IncludeProps extends IncludedProps<Props>,
> = ResolveInputProps<SelectedIncludedProps<Props, IncludeProps, 'required', 'component'>> &
  Partial<ResolveInputProps<SelectedIncludedProps<Props, IncludeProps, 'optional', 'component'>>>;

/**
 * Like {@link ResolvedIncludedProps}, but keeps included prop keys exactly as
 * declared: component slots are not renamed to their capitalized form.
 */
export type ResolvedIncludedPropsAsDefined<
  Props extends InPropsObject,
  IncludeProps extends IncludedProps<Props>,
> = ResolvePropsAsDefined<SelectedIncludedProps<Props, IncludeProps, 'required'>> &
  Partial<ResolvePropsAsDefined<SelectedIncludedProps<Props, IncludeProps, 'optional'>>>;
export type LayoutRenderProps<
  Resources extends ReadonlyArray<ResourceDefinition>,
  Options extends InPropsDefinition<Resources>,
  Composables extends ComposableComponents = {},
  IncludeProps extends LayoutIncludeProps<Resources, Options, Composables> = {},
  CustomProps extends CustomPropsObject = {},
> = Show<
  ResolveRenderProps<CustomProps> &
    ResolvedIncludedProps<MergedLayoutInProps<Resources, Options, Composables>, IncludeProps>
>;

export function getIncludedPropBehavior(value: unknown): {
  visibility: 'required' | 'optional';
  passthrough: 'component' | 'config';
} | null {
  if (value === null || typeof value !== 'object') {
    return null;
  }

  if ('visibility' in value || 'passthrough' in value) {
    throw new LayoutConfigurationError(
      'Include properties visibility and passthrough were removed; use required and suppliedVia.',
    );
  }

  const required =
    'required' in value && typeof value.required === 'boolean' ? value.required : undefined;
  const suppliedVia = 'suppliedVia' in value ? value.suppliedVia : undefined;

  if (required === undefined || (suppliedVia !== 'component' && suppliedVia !== 'config')) {
    return null;
  }

  return {
    visibility: required ? 'required' : 'optional',
    passthrough: suppliedVia,
  };
}
