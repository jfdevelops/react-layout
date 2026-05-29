import {
  createProp,
  type AnyBuiltPropDefinition,
  type CreateOptionalValue,
  type CreateRequiredValue,
  type DependentOnValueDefinition,
  type OptionalValueDefinition,
  type PrimitiveTypesMap,
  type RequiredValueDefinition,
  type RequiredWhen,
} from './create-value';
import {
  normalizeResources,
  type NormalizeResources,
  type ResourceDefinition,
} from './resource';

type ViewMapConfig<Views extends string> = {};
type ViewComponentFnResult =
  | OptionalValueDefinition<unknown, keyof PrimitiveTypesMap>
  | RequiredValueDefinition<unknown, keyof PrimitiveTypesMap>
  | RequiredWhen<unknown, unknown, keyof PrimitiveTypesMap>
  | DependentOnValueDefinition<unknown, keyof PrimitiveTypesMap, unknown>
  | (OptionalValueDefinition<unknown, keyof PrimitiveTypesMap> & {
      dependentOn: unknown;
    });
type ViewComponentFn = (createValue: {
  optional: CreateOptionalValue;
  required: CreateRequiredValue;
}) => ViewComponentFnResult;
type ViewComponentDefinition =
  | string
  | Record<string, ViewComponentFn | ViewComponentFnResult>;

interface BaseConfigComponents {}

type DefinedResourceLayout<
  Resources extends ReadonlyArray<ResourceDefinition>,
> = {
  views: NormalizeResources<Resources>;
};

type CreateViewMapOptions<
  Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends Record<string, AnyBuiltPropDefinition>,
> = {
  /**
   * An array of valid resource names to support.
   */
  resources: Resources;
  /**
   * The props that are passed into the created resource layout.
   */
  inProps: InProps;
  /**
   * An array of valid components that all
   */
  // baseComponents: Array<BaseComponent>;
};

const test = defineResourceLayout({
  resources: [
    {
      value: 'users',
      subResources: ['admins', 'managers'],
    },
    'groups',
    'roles',
  ],
  inProps: {
    title: createProp.string(),
  },
});

export function defineResourceLayout<
  const Resources extends ReadonlyArray<ResourceDefinition>,
  InProps extends Record<string, AnyBuiltPropDefinition>,
>(
  options: CreateViewMapOptions<Resources, InProps>,
): DefinedResourceLayout<Resources> {
  const { inProps, resources } = options;

  return {
    views: normalizeResources(resources),
  };
}
