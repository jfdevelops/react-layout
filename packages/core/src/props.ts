import {
  AnyBuiltPropDefinition,
  EnumWrappedProp,
  LiteralWrappedProp,
  ResolveLayoutProps,
  ResolveProps,
} from './validators';
import type { ComposableComponents, MergePresetProps } from './composable';
import { ResourceDefinition, ResourceEnum } from './resource';
import { Show } from './utils';

export type InPropsObject = Record<string, AnyBuiltPropDefinition>;
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
> = InferredInProps<Resources, Options> extends InPropsObject
  ? InferredInProps<Resources, Options> & MergePresetProps<Composables>
  : never;
/**
 * A map of props to include in the layout.
 */
export type IncludedProps<T extends object> = {
  [K in keyof T & string]?: true;
};
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
    ResolveLayoutProps<
      Pick<
        MergedLayoutInProps<Resources, Options, Composables>,
        keyof IncludeProps & string
      >
    >
>;
