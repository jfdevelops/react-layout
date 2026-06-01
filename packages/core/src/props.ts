import {
  AnyBuiltPropDefinition,
  EnumWrappedProp,
  LiteralWrappedProp,
} from './create-value';
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
/**
 * A map of props to include in the layout.
 */
export type IncludedProps<T> = {
  [_ in keyof T]?: true;
};
