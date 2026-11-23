import {
  createResourceSchemaAdapter,
  type ResourceSchemaTypes,
} from '@jfdevelops/react-layout-adapters';
import { Schema } from 'effect';

interface NativeResourceSchemas extends ResourceSchemaTypes {
  readonly union: ReturnType<
    typeof Schema.toStandardSchemaV1<Schema.Literals<this['value'][]>>
  >;
  readonly array: ReturnType<
    typeof Schema.toStandardSchemaV1<
      Schema.$Array<Schema.Literals<this['value'][]>>
    >
  >;
}

/** Creates native resource schemas with shared selection and nesting behavior. */
export const createResourceSchema =
  createResourceSchemaAdapter<NativeResourceSchemas>({
    union: (values) => Schema.toStandardSchemaV1(Schema.Literals(values)),
    array: (schema) => Schema.toStandardSchemaV1(Schema.Array(schema)),
  });
