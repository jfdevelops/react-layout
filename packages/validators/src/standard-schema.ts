import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { AnyBuiltPropDefinition } from './types';
import { PropError } from './prop-error';

export function isStandardSchema(value: unknown): value is StandardSchemaV1 {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) return false;
  if (!('~standard' in value)) return false;
  const standard = value['~standard'];
  return typeof standard === 'object' && standard !== null &&
    'version' in standard && standard.version === 1 &&
    'validate' in standard && typeof standard.validate === 'function';
}

export function containsStandardSchema(definition: unknown, visited = new Set<unknown>()): boolean {
  if (isStandardSchema(definition)) {

    return true;
  }

  if (definition === null || (typeof definition !== 'object' && typeof definition !== 'function') || visited.has(definition)) {

    return false;
  }

  visited.add(definition);
  const children: unknown[] = [];

  if ('properties' in definition && typeof definition.properties === 'object' && definition.properties !== null) {
    children.push(...Object.values(definition.properties));
  }

  if ('itemProp' in definition) {
    children.push(definition.itemProp);
  }

  if ('valueProp' in definition) {
    children.push(definition.valueProp);
  }

  if ('keyProp' in definition) {
    children.push(definition.keyProp);
  }

  if ('members' in definition && Array.isArray(definition.members)) {
    children.push(...definition.members);
  }

  return children.some((child) => containsStandardSchema(child, visited));
}

export function validateDefinition(definition: AnyBuiltPropDefinition, value: unknown) {
  if (!isStandardSchema(definition)) {
    const result = definition(value);

    // Pure legacy validation preserves input instances and undeclared fields.
    // Only schema-backed containers introduce parsed/defaulted output values.
    return result === undefined || !containsStandardSchema(definition) ? value : result;
  }
  const result = definition['~standard'].validate(value);
  if (result instanceof Promise || ('then' in result && typeof result.then === 'function')) {
    // Handle rejected async refinements without leaking an unhandled rejection.
    void Promise.resolve(result).catch(() => {});
    throw new TypeError('React Layout schemas must validate synchronously.');
  }
  if (result.issues) {
    const issue = result.issues[0];
    const path = issue?.path?.map((segment) =>
      typeof segment === 'object' ? String(segment.key) : String(segment),
    ).join('.') || 'value';
    throw new PropError({
      path,
      received: value,
      expected: definition['~standard'].vendor,
      message: issue?.message ?? 'Schema validation failed',
      issues: result.issues,
    });
  }
  return result.value;
}
