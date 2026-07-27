import type { ComposableComponents, MergePresetProps } from '@jfdevelops/react-layout-composables';
import type { InPropsObject } from '@jfdevelops/react-layout-composables';
import {
  EnumWrappedProp,
  LiteralWrappedProp,
  ResolveLayoutProps,
  ResolveProps,
} from '@jfdevelops/react-layout-validator';
import { ResourceDefinition, ResourceEnum } from './resource';
import { Show } from './utils';

export type { InPropsObject };
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
  [K in keyof T & string]?: true | 'optional';
};

type RequiredIncludedPropKeys<IncludeProps extends object> = {
  [Key in keyof IncludeProps]: IncludeProps[Key] extends true ? Key : never;
}[keyof IncludeProps];

type OptionalIncludedPropKeys<IncludeProps extends object> = {
  [Key in keyof IncludeProps]: IncludeProps[Key] extends 'optional'
    ? Key
    : never;
}[keyof IncludeProps];

export type ResolvedIncludedProps<
  Props extends InPropsObject,
  IncludeProps extends IncludedProps<Props>,
> = ResolveLayoutProps<
  Pick<Props, RequiredIncludedPropKeys<IncludeProps> & keyof Props>
> &
  Partial<
    ResolveLayoutProps<
      Pick<Props, OptionalIncludedPropKeys<IncludeProps> & keyof Props>
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
