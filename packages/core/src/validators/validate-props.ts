import type { AnyBuiltPropDefinition } from './types';

export class MissingRequiredPropError extends Error {
  constructor(key: string) {
    super(`Property "${key}" is required but not provided.`);
  }
}

export function validateProps<T extends object>(
  shape: Record<string, AnyBuiltPropDefinition>,
  props: T,
) {
  for (const key in shape) {
    const prop = shape[key];

    if (prop.visibility === 'required' && !(key in props)) {
      throw new MissingRequiredPropError(key);
    }

    if (prop.visibility === 'optional' && !(key in props)) {
      continue;
    }

    prop((props as Record<string, unknown>)[key]);
  }

  return props;
}
