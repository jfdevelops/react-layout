import { type } from 'arktype';
import type { StandardSchemaV1 } from '@standard-schema/spec';

import { validatorErrorFactory } from './errors';

const propErrorContext = type({
  'layoutName?': 'string | undefined',
  path: 'string',
  'resource?': 'string | undefined',
  received: 'unknown',
  expected: 'unknown',
  message: 'string',
  'issues?': 'unknown',
});

export type PropErrorOptions = typeof propErrorContext.infer;

type PropMessageOptions = Pick<PropErrorOptions, 'path' | 'layoutName' | 'resource'>;

type MismatchedPropMessageOptions = PropMessageOptions &
  Pick<PropErrorOptions, 'received' | 'expected'>;

function createPropLocation({ layoutName, resource }: PropMessageOptions) {
  return layoutName === undefined || resource === undefined
    ? ''
    : ` in layout "${layoutName}" (resource: "${resource}")`;
}

export function createMissingPropMessage(options: PropMessageOptions) {
  return `Missing required prop "${options.path}"${createPropLocation(options)}.`;
}

export function createMismatchedPropMessage(options: MismatchedPropMessageOptions) {
  return `Invalid prop "${options.path}"${createPropLocation(options)}: expected "${options.expected}", received "${options.received}".`;
}

export class PropError extends validatorErrorFactory({
  code: 'invalidProp',
})
  .defineContext(propErrorContext)
  .implement(({ message }) => message) {
  get layoutName() {
    return this.context.layoutName;
  }

  get path() {
    return this.context.path;
  }

  get resource() {
    return this.context.resource;
  }

  get received() {
    return this.context.received;
  }

  get expected() {
    return this.context.expected;
  }

  /**
   * Original Standard Schema issues, with paths relative to the props object.
   */
  get issues() {
    return this.context.issues as readonly StandardSchemaV1.Issue[] | undefined;
  }
}

export function getPropValueType(value: unknown) {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  return typeof value;
}
