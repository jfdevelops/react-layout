type Metadata = Record<string, unknown>;
function object(value: unknown): value is Metadata {
  return typeof value === 'object' && value !== null;
}
/** The Standard Schema vendor name, read without running the schema. */
function schemaVendor(value: unknown): string | undefined {
  if (typeof value !== 'function' && !object(value)) {
    return;
  }
  const standard = (value as Metadata)['~standard'];
  if (!object(standard) || standard.version !== 1 || typeof standard.validate !== 'function') {
    return;
  }

  return typeof standard.vendor === 'string' ? standard.vendor : 'unknown';
}
export interface PropValidatorDescription {
  /**
   * A label for the schema, such as `zod schema`.
   */
  type: string;
}
/** Read validator metadata without executing user code. */
export function inspectPropValidator(value: unknown): PropValidatorDescription | undefined {
  const vendor = schemaVendor(value);

  return vendor === undefined
    ? undefined
    : {
        type: `${vendor} schema`,
      };
}
export function describePropValidator(value: unknown): string | undefined {
  return inspectPropValidator(value)?.type;
}
/** Sanitize inspection values, letting adapters present validator metadata semantically. */
export function mapInspectionDetails(
  details: object,
  validator: (description: PropValidatorDescription) => unknown,
): unknown {
  function visit(value: unknown, path: Set<object>, depth: number): unknown {
    const description = inspectPropValidator(value);
    if (description) {
      return validator(description);
    }
    if (typeof value === 'function') {
      return `[function${value.name ? ` ${value.name}` : ''}]`;
    }
    if (typeof value === 'bigint' || typeof value === 'symbol') {
      return String(value);
    }
    if (!object(value)) {
      return value;
    }
    if (path.has(value)) {
      return '[circular reference]';
    }
    if (depth > 16) {
      return '[maximum depth]';
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString();
    }
    if (value instanceof RegExp) {
      return String(value);
    }
    const next = new Set([...path, value]);
    if (Array.isArray(value)) {
      return value.map((item) => visit(item, next, depth + 1));
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, visit(child, next, depth + 1)]),
    );
  }

  return visit(details, new Set(), 0);
}
/** Human-readable text for adapters without rich rendering. */
export function formatInspectionDetails(details: object): string {
  return JSON.stringify(
    mapInspectionDetails(details, (prop) => prop.type),
    null,
    2,
  );
}
