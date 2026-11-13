import {
  InvalidComponentError,
  InvalidPathError,
  InvalidResourceError,
  InvalidSubResourceError,
  MissingPathVariableError,
} from '../../errors';
import {
  isConfigNode,
  readComponentKeys,
  readSubResourceKeys,
} from '../component-keys';
import { readPathVariableName } from './variables';

/** A `$subResource` value: a slug, or a slug plus the next `subResource` below it. */
export type SubResourceParamValue =
  | string
  | { value: string; subResource: SubResourceParamValue };

/** Values supplied for the variables a path leaves open. */
export type PathVariableValues = {
  resource?: string;
  subResource?: SubResourceParamValue;
  component?: string;
};

function readSubResourceParamKey(param: SubResourceParamValue): string {
  return typeof param === 'string' ? param : param.value;
}

/** Sub-resource slugs a param walks through, outermost first. */
export function flattenSubResourceParam(
  param: SubResourceParamValue,
): string[] {
  if (typeof param === 'string') {
    return [param];
  }

  return [param.value, ...flattenSubResourceParam(param.subResource)];
}

function isSubResourceParamValue(
  value: unknown,
): value is SubResourceParamValue {
  if (typeof value === 'string') {
    return value.length > 0;
  }

  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const { value: slug, subResource } = value as {
    value?: unknown;
    subResource?: unknown;
  };

  return typeof slug === 'string' && isSubResourceParamValue(subResource);
}

function resolveSubResourceParam(
  node: unknown,
  param: SubResourceParamValue,
  resource: string | undefined,
): unknown {
  const key = readSubResourceParamKey(param);

  if (!isConfigNode(node)) {
    throw new InvalidSubResourceError({
      subResource: key,
      resource,
      reason: `"${key}" cannot be read because its parent is not a configured resource`,
    });
  }

  const next = node[key];

  if (!isConfigNode(next)) {
    throw new InvalidSubResourceError({
      subResource: key,
      resource,
      validSubResources: readSubResourceKeys(node),
    });
  }

  if (typeof param === 'string') {
    return next;
  }

  return resolveSubResourceParam(next, param.subResource, resource);
}

function readVariable<Name extends keyof PathVariableValues>(
  variables: PathVariableValues,
  name: Name,
  path: string,
): NonNullable<PathVariableValues[Name]> {
  const value = variables[name];

  if (value === undefined) {
    throw new MissingPathVariableError({
      variable: name,
      path,
      providedVariables: Object.keys(variables),
    });
  }

  return value as NonNullable<PathVariableValues[Name]>;
}

/**
 * Reads the value a path points at, substituting variable segments from `variables`.
 * Throws a typed error naming the segment that could not be resolved.
 */
export function resolveParameterizedPath(
  config: Record<string, unknown>,
  path: string,
  variables: PathVariableValues = {},
): unknown {
  const segments = path.split('.');
  let cursor: unknown = config;
  let resource: string | undefined;

  for (const [index, segment] of segments.entries()) {
    const isRoot = index === 0;
    const variableName = readPathVariableName(segment);

    if (variableName === undefined) {
      if (!isConfigNode(cursor)) {
        throw new InvalidPathError({
          path,
          reason: `"${segment}" cannot be read because the value before it is not a config branch`,
        });
      }

      const next = cursor[segment];

      if (next === undefined) {
        if (isRoot) {
          throw new InvalidResourceError({
            resource: segment,
            validResources: Object.keys(config),
          });
        }

        throw new InvalidPathError({
          path,
          reason: `"${segment}" is not configured`,
        });
      }

      if (isRoot) {
        resource = segment;
      }

      cursor = next;
      continue;
    }

    switch (variableName) {
      case 'resource': {
        const value = readVariable(variables, 'resource', path);

        if (typeof value !== 'string' || !isConfigNode(config[value])) {
          throw new InvalidResourceError({
            resource: value,
            validResources: Object.keys(config),
          });
        }

        resource = value;
        cursor = config[value];
        break;
      }
      case 'subResource': {
        const value = readVariable(variables, 'subResource', path);

        if (!isSubResourceParamValue(value)) {
          throw new InvalidSubResourceError({
            subResource: value,
            resource,
            reason:
              'A sub-resource must be a slug or an object with `value` and `subResource`',
          });
        }

        cursor = resolveSubResourceParam(cursor, value, resource);
        break;
      }
      case 'component': {
        const value = readVariable(variables, 'component', path);

        if (!isConfigNode(cursor)) {
          throw new InvalidComponentError({
            component: value,
            path,
            resource,
            reason: `"${String(value)}" cannot be read because the value before it is not a config branch`,
          });
        }

        if (typeof value !== 'string' || cursor[value] === undefined) {
          throw new InvalidComponentError({
            component: value,
            path,
            resource,
            validComponents: readComponentKeys(cursor),
          });
        }

        cursor = cursor[value];
        break;
      }
      default: {
        throw new InvalidPathError({
          path,
          reason: `"${segment}" is not a supported path variable`,
        });
      }
    }
  }

  return cursor;
}
