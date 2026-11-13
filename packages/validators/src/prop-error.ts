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
