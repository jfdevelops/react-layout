import { createError } from '@jfdevelops/create-error';
import { createContextSchema } from '@jfdevelops/react-layout-validator';

const composableErrorFactory = createError({
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

/** Thrown when the composable component map is not an object. */
export class InvalidComponentsError extends composableErrorFactory({
  code: 'invalidComponents',
})
  .defineContext(createContextSchema<string>())
  .implement((message) => message) {}

/** Thrown when no composable components were provided. */
export class EmptyComponentsError extends composableErrorFactory({
  code: 'emptyComponents',
})
  .defineContext(createContextSchema<string>())
  .implement((message) => message) {}
