import { isStandardSchema } from './standard-schema';
import type { AnyBuiltPropDefinition } from './types';

type ValueBackedDefinition = {
  _baseProp?: {
    value?: unknown;
  };
};

export function isPropDefinitionShape(value: unknown): value is AnyBuiltPropDefinition {
  return isStandardSchema(value) || (typeof value === 'function' && 'visibility' in value);
}

export function resolvePropDefinitionValues(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};

  for (const key of Object.keys(input)) {
    const value = input[key];
    out[key] = isPropDefinitionShape(value)
      ? (value as ValueBackedDefinition)._baseProp?.value
      : value;
  }

  return out;
}
