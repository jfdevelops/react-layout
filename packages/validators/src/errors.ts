import { createError } from '@jfdevelops/create-error';

import { object, string } from './built-in';

export const validatorErrorFactory = createError({
  definition: object({
    code: string,
  }),
  data: {
    property: 'context',
    resolve: ({ input }) => input,
  },
  message: ({ data, implementation }) => implementation(data),
  properties: ({ definition }) => ({
    code: definition.code,
  }),
});
