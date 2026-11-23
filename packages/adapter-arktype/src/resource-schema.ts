import {
  getResourceSchemaValues,
  type SchemaResource,
  type ResourceSchemaInput,
  type ResourceSchemaOptions,
  type ResourceSchemaArguments,
  type ResourceSchemaOptionValue,
  type ResourceSchemaResult,
} from '@jfdevelops/react-layout-adapters';
import { type, type Type } from 'arktype';

function createUnionSchema<Value extends string>(values: Value[]): Type<Value> {
  return type.enumerated(...values);
}

function createArraySchema<Value extends string>(
  values: Value[],
): Type<Value[]> {
  return createUnionSchema(values).array();
}

/** Creates a literal union or array schema, with independent nested-resource options. */
export function createResourceSchema<
  const Input extends ResourceSchemaInput<readonly SchemaResource[]>,
  const Options extends ResourceSchemaOptions & { args?: readonly unknown[] },
>(
  resources: Input,
  options: Options & ResourceSchemaArguments<Input>,
): ResourceSchemaResult<
  Options['format'],
  ReturnType<
    typeof createUnionSchema<ResourceSchemaOptionValue<Input, Options>>
  >,
  ReturnType<
    typeof createArraySchema<ResourceSchemaOptionValue<Input, Options>>
  >
>;
export function createResourceSchema<
  const Input extends ResourceSchemaInput<readonly SchemaResource[]>,
>(
  resources: Input &
    ([] extends (Input extends (...args: infer Args) => unknown ? Args : [])
      ? unknown
      : never),
): ReturnType<typeof createUnionSchema<ResourceSchemaOptionValue<Input, {}>>>;
export function createResourceSchema(
  resources: ResourceSchemaInput<readonly SchemaResource[]>,
  options?: ResourceSchemaOptions & { args?: readonly unknown[] },
) {
  const values = getResourceSchemaValues(resources, options);

  return options?.format === 'array'
    ? createArraySchema(values)
    : createUnionSchema(values);
}
