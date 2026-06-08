type ValueBackedDefinition = {
  _baseProp?: {
    value?: unknown;
  };
};

export function isPropDefinitionShape(value: unknown): value is {
  visibility: unknown;
} {
  return typeof value === 'function' && value !== null && 'visibility' in value;
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
