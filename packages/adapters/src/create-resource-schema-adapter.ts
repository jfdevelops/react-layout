import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
  getResourceSchemaValues,
  type SchemaResource,
  type ResourceSchemaInput,
  type ResourceSchemaOptions,
  type ResourceSchemaArguments,
  type ResourceSchemaOptionValue,
  type ResourceSchemaResult,
} from './resource-schema';

/** Native schema family, parameterized by the selected string literal type. */
export interface ResourceSchemaTypes {
  readonly value: string;
  readonly union: StandardSchemaV1;
  readonly array: StandardSchemaV1;
}

type NativeSchema<
  Types extends ResourceSchemaTypes,
  Value extends string,
  Format extends 'union' | 'array',
> = (Types & { readonly value: Value })[Format];

/** Shared resource schema factory with native return types and typed method arguments. */
export interface CreateResourceSchema<Types extends ResourceSchemaTypes> {
  <
    const Input extends ResourceSchemaInput<readonly SchemaResource[]>,
    const Options extends ResourceSchemaOptions & { args?: readonly unknown[] },
  >(
    resources: Input,
    options: Options & ResourceSchemaArguments<Input>,
  ): ResourceSchemaResult<
    Options['format'],
    NativeSchema<Types, ResourceSchemaOptionValue<Input, Options>, 'union'>,
    NativeSchema<Types, ResourceSchemaOptionValue<Input, Options>, 'array'>
  >;
  <const Input extends ResourceSchemaInput<readonly SchemaResource[]>>(
    resources: Input &
      ([] extends (Input extends (...args: infer Args) => unknown ? Args : [])
        ? unknown
        : never),
  ): NativeSchema<Types, ResourceSchemaOptionValue<Input, {}>, 'union'>;
}

/** Native constructors used by the shared resource-schema adapter. */
export type ResourceSchemaAdapterOptions<Types extends ResourceSchemaTypes> = {
  union: (values: string[]) => Types['union'];
  array: (schema: Types['union']) => Types['array'];
};

/** Binds native constructors to shared resource selection, nesting, and shape handling. */
export function createResourceSchemaAdapter<Types extends ResourceSchemaTypes>(
  constructors: ResourceSchemaAdapterOptions<Types>,
): CreateResourceSchema<Types> {
  function createResourceSchema(
    resources: ResourceSchemaInput<readonly SchemaResource[]>,
    options?: ResourceSchemaOptions & { args?: readonly unknown[] },
  ) {
    const values = getResourceSchemaValues(resources, options);
    const union = constructors.union(values);

    return options?.format === 'array' ? constructors.array(union) : union;
  }

  // The constructors receive exactly the literals represented by the selected schema family.
  return createResourceSchema as CreateResourceSchema<Types>;
}
