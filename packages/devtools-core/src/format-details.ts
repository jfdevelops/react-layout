type Metadata = Record<string, unknown>;
function object(value: unknown): value is Metadata {
  return typeof value === 'object' && value !== null;
}
function metadata(value: unknown): Metadata | undefined {
  if (typeof value !== 'function' && !object(value)) return;
  const candidate = (value as Metadata)._baseProp ?? value;
  if (
    (typeof candidate === 'function' || object(candidate)) &&
    typeof (candidate as Metadata).type === 'string' &&
    ['required', 'optional'].includes(
      String((candidate as Metadata).visibility)
    )
  )
    return candidate as Metadata;
}
function literal(value: unknown): string {
  return typeof value === 'bigint'
    ? `${value}n`
    : typeof value === 'symbol'
    ? String(value)
    : JSON.stringify(value) ?? String(value);
}
function describe(value: unknown, path: Set<unknown>, depth = 0): string {
  const prop = metadata(value);
  if (!prop) return 'unknown';
  if (depth > 12) return '…';
  if (path.has(prop)) return 'recursive';
  const next = new Set([...path, prop]);
  function shape(properties: unknown): string {
    if (!object(properties)) return '{}';
    const fields = Object.entries(properties).map(
      ([key, child]) =>
        `${/^[a-zA-Z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)}${
          metadata(child)?.visibility === 'optional' ? '?' : ''
        }: ${describe(child, next, depth + 1)}`
    );
    return fields.length ? `{ ${fields.join('; ')} }` : '{}';
  }
  if (Array.isArray(prop.allowedValues))
    return prop.allowedValues.map(literal).join(' | ');
  if (prop.value !== undefined) return literal(prop.value);
  if (prop.type === 'union' && Array.isArray(prop.members))
    return prop.members
      .map((member) => describe(member, next, depth + 1))
      .join(' | ');
  if (prop.type === 'record')
    return `Record<${
      prop.keyProp ? describe(prop.keyProp, next, depth + 1) : 'string'
    }, ${describe(prop.valueProp, next, depth + 1)}>`;
  if (prop.type === 'function' && prop.renderProps)
    return `(props: ${shape(prop.renderProps)}) => ${
      prop.childrenType ?? 'ReactNode'
    }`;
  if (prop.properties)
    return prop.type === 'object'
      ? shape(prop.properties)
      : `${prop.type}<${shape(prop.properties)}>`;
  const names: Record<string, string> = {
    array: 'unknown[]',
    date: 'Date',
    regex: 'RegExp',
    error: 'Error',
    function: 'Function',
  };
  return names[String(prop.type)] ?? String(prop.type);
}
export interface PropValidatorDescription {
  type: string;
  visibility: 'required' | 'optional';
}
/** Read validator metadata without executing user code. */
export function inspectPropValidator(
  value: unknown
): PropValidatorDescription | undefined {
  if (typeof value !== 'function') return;
  const prop = metadata(value);
  if (!prop) return;
  return {
    type: describe(value, new Set()),
    visibility: prop.visibility as 'required' | 'optional',
  };
}
export function describePropValidator(value: unknown): string | undefined {
  const prop = inspectPropValidator(value);
  return prop && `${prop.type} (${prop.visibility})`;
}
/** Sanitize inspection values, letting adapters present validator metadata semantically. */
export function mapInspectionDetails(
  details: object,
  validator: (description: PropValidatorDescription) => unknown
): unknown {
  function visit(value: unknown, path: Set<object>, depth: number): unknown {
    const description = inspectPropValidator(value);
    if (description) return validator(description);
    if (typeof value === 'function')
      return `[function${value.name ? ` ${value.name}` : ''}]`;
    if (typeof value === 'bigint' || typeof value === 'symbol')
      return String(value);
    if (!object(value)) return value;
    if (path.has(value)) return '[circular reference]';
    if (depth > 16) return '[maximum depth]';
    if (value instanceof Date)
      return Number.isNaN(value.getTime())
        ? 'Invalid Date'
        : value.toISOString();
    if (value instanceof RegExp) return String(value);
    const next = new Set([...path, value]);
    if (Array.isArray(value))
      return value.map((item) => visit(item, next, depth + 1));
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        visit(child, next, depth + 1),
      ])
    );
  }
  return visit(details, new Set(), 0);
}
/** Human-readable text for adapters without rich rendering. */
export function formatInspectionDetails(details: object): string {
  return JSON.stringify(
    mapInspectionDetails(
      details,
      (prop) => `${prop.type} (${prop.visibility})`
    ),
    null,
    2
  );
}
