import {
  createResourceSchemaAdapter,
  type ResourceSchemaTypes,
} from '@jfdevelops/react-layout-adapters';
import {
  picklist,
  array,
  type PicklistSchema,
  type ArraySchema,
} from 'valibot';

interface NativeResourceSchemas extends ResourceSchemaTypes {
  readonly union: PicklistSchema<this['value'][], undefined>;
  readonly array: ArraySchema<this['union'], undefined>;
}

/** Creates native resource schemas with shared selection and nesting behavior. */
export const createResourceSchema =
  createResourceSchemaAdapter<NativeResourceSchemas>({
    union: (values) => picklist(values),
    array: (schema) => array(schema),
  });
