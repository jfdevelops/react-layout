import {
  createResourceSchemaAdapter,
  type ResourceSchemaTypes,
} from '@jfdevelops/react-layout-adapters';
import { z } from 'zod';

interface NativeResourceSchemas extends ResourceSchemaTypes {
  readonly union: z.ZodEnum<Record<this['value'], this['value']>>;
  readonly array: z.ZodArray<this['union']>;
}

/** Creates native resource schemas with shared selection and nesting behavior. */
export const createResourceSchema =
  createResourceSchemaAdapter<NativeResourceSchemas>({
    union: (values) => z.enum(values),
    array: (schema) => z.array(schema),
  });
