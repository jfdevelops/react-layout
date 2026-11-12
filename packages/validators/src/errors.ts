import { createError } from '@jfdevelops/create-error';
import { createContextSchema } from './context-schema';

export const validatorErrorFactory = createError({
  definition: createContextSchema<{ code: string }>(),
  data: {
    property: 'context',
    resolve: ({ input }) => input,
  },
  message: ({ data, implementation }) => implementation(data),
  properties: ({ definition }) => ({
    code: definition.code,
  }),
});

export class InvalidWrapperError extends validatorErrorFactory({
  code: 'invalidWrapper',
})
  .defineContext(createContextSchema<string>())
  .implement((message) => message) {}

export class InvalidRecordKeyError extends validatorErrorFactory({
  code: 'invalidRecordKey',
})
  .defineContext(createContextSchema<string>())
  .implement((message) => message) {}

Object.setPrototypeOf(InvalidRecordKeyError.prototype, TypeError.prototype);
