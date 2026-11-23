import {
  createResourceSchemaAdapter,
  type ResourceSchemaTypes,
} from '@jfdevelops/react-layout-adapters';
import { type, type Type } from 'arktype';

interface NativeResourceSchemas extends ResourceSchemaTypes {
  readonly union: Type<this['value']>;
  readonly array: Type<this['value'][]>;
}

/** Creates native resource schemas with shared selection and nesting behavior. */
export const createResourceSchema =
  createResourceSchemaAdapter<NativeResourceSchemas>({
    union: (values) => type.enumerated(...values),
    array: (schema) => schema.array(),
  });
