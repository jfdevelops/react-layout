import { createError } from '@jfdevelops/create-error';
import { type } from 'arktype';

export const validatorErrorFactory = createError({
  definition: type({ code: 'string' }),
  data: {
    property: 'context',
    resolve: ({ input }) => input,
  },
  message: ({ data, implementation }) => implementation(data),
  properties: ({ definition }) => ({ code: definition.code }),
});

export class InvalidWrapperError extends validatorErrorFactory({
  code: 'invalidWrapper',
})
  .defineContext(type('string'))
  .implement((message) => message) {}

export class InvalidRecordKeyError extends validatorErrorFactory({
  code: 'invalidRecordKey',
})
  .defineContext(type('string'))
  .implement((message) => message) {}

Object.setPrototypeOf(InvalidRecordKeyError.prototype, TypeError.prototype);
