import { describeSchema, type SchemaDescription } from './describe-schema';

type Metadata = Record<string, unknown>;

function object(value: unknown): value is Metadata {
  return typeof value === 'object' && value !== null;
}

export type PropValidatorDescription = SchemaDescription;
/** Read validator metadata without validating a value. */
export function inspectPropValidator(
  value: unknown,
): PropValidatorDescription | undefined {
  return describeSchema(value);
}

function describe(description: PropValidatorDescription) {
  const requirement = description.visibility
    ? ` (${description.visibility})`
    : '';

  return `${description.type}${requirement} · ${description.vendor}`;
}

export function describePropValidator(value: unknown): string | undefined {
  const description = inspectPropValidator(value);

  return description && describe(description);
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
      return Number.isNaN(value.getTime())
        ? 'Invalid Date'
        : value.toISOString();
    }

    if (value instanceof RegExp) {
      return String(value);
    }

    const next = new Set([...path, value]);
    if (Array.isArray(value)) {
      return value.map((item) => visit(item, next, depth + 1));
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        visit(child, next, depth + 1),
      ]),
    );
  }

  return visit(details, new Set(), 0);
}
/** Human-readable text for adapters without rich rendering. */
export function formatInspectionDetails(details: object): string {
  return JSON.stringify(mapInspectionDetails(details, describe), null, 2);
}
