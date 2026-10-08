import { createError } from '@jfdevelops/create-error';
import { type } from 'arktype';

const composableErrorFactory = createError({
  definition: type({ code: 'string' }),
  data: {
    property: 'context',
    resolve: ({ input }) => input,
  },
  message: ({ data, implementation }) => implementation(data),
  properties: ({ definition }) => ({ code: definition.code }),
});

/** Thrown when the composable component map is not an object. */
export class InvalidComponentsError extends composableErrorFactory({
  code: 'invalidComponents',
})
  .defineContext(type('string'))
  .implement((message) => message) {}

/** Thrown when no composable components were provided. */
export class EmptyComponentsError extends composableErrorFactory({
  code: 'emptyComponents',
})
  .defineContext(type('string'))
  .implement((message) => message) {}
