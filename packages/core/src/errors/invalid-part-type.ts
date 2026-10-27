import { type } from 'arktype';
import { createReactLayoutError } from './react-layout-error';

const context = type({
  part: 'string',
  expectedType: "'string' | 'number'",
  receivedType: 'string',
  scope: "'namingPart'"
});

export type InvalidPartTypeContext = typeof context.infer;

/**
 * Thrown when a supplied naming part does not match its declared value kind.
 */
export class InvalidPartTypeError extends createReactLayoutError({
  code: 'invalidPartType',
  scope: 'namingPart'
})
  .defineContext(context)
  .implement(
    ({ context, scope }) =>
      `[${scope}]: Naming part ${JSON.stringify(context.part)} must be a ${
        context.expectedType
      }; received ${context.receivedType}.`
  ) {}
