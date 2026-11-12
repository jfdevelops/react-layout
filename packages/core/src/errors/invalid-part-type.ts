import { createContextSchema } from '@jfdevelops/react-layout-validator';
import { createReactLayoutError } from './react-layout-error';

export interface InvalidPartTypeContext {
  part: string;
  expectedType: 'string' | 'number';
  receivedType: string;
  scope: 'namingPart';
}

const context = createContextSchema<InvalidPartTypeContext>();

/**
 * Thrown when a supplied naming part does not match its declared value kind.
 */
export class InvalidPartTypeError extends createReactLayoutError({
  code: 'invalidPartType',
  scope: 'namingPart',
})
  .defineContext(context)
  .implement(
    ({ context, scope }) =>
      `[${scope}]: Naming part ${JSON.stringify(context.part)} must be a ${
        context.expectedType
      }; received ${context.receivedType}.`,
  ) {}
