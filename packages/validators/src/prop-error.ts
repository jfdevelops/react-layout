import type { StandardSchemaV1 } from '@standard-schema/spec';

import { object, string, unknown } from './built-in';
import { validatorErrorFactory } from './errors';

const propErrorContext = object({
  layoutName: string.optional(),
  path: string,
  resource: string.optional(),
  received: unknown,
  expected: unknown,
  message: string,
  issues: unknown,
});

export type PropErrorOptions = StandardSchemaV1.InferOutput<
  typeof propErrorContext
>;

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
