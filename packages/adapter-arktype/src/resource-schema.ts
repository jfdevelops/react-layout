import {
  getResourceSchemaValues,
  type SchemaResource,
  type ResourceSchemaInput,
  type ResourceSchemaFormat,
  type ResourceSchemaOptions,
} from '@jfdevelops/react-layout-adapters';
import { type } from 'arktype';

/** Creates a literal union schema from layout resources (top-level keys by default). */
export function createResourceSchema<
  const Input extends ResourceSchemaInput<readonly SchemaResource[]>,
  const Format extends ResourceSchemaFormat = 'keys',
>(resources: Input, options?: ResourceSchemaOptions<Format>) {
  const values = getResourceSchemaValues(resources, options);

  return type.enumerated(...values);
}
