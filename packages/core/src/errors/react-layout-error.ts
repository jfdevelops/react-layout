import { createError } from '@jfdevelops/create-error';
import { type } from 'arktype';

function makeJsonSafe(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map(makeJsonSafe);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        makeJsonSafe(nestedValue),
      ]),
    );
  }

  return value;
}

/** @internal */
export const createReactLayoutError = createError({
  definition: type({ code: 'string', scope: 'string' }),
  data: {
    property: 'context',
    resolve: ({ definition, input }) =>
      typeof input === 'object' && input !== null
        ? { ...input, scope: definition.scope }
        : input,
  },
  message: ({ definition, data, implementation }) =>
    implementation({ context: data, scope: definition.scope }),
  properties: ({ definition, data, implementation }) => ({
    code: definition.code,
    scope: definition.scope,
    renderMessage(renderer = implementation) {
      return renderer({ context: data, scope: definition.scope });
    },
  }),
  toJSON: (error) => ({
    name: error.name,
    code: error.code,
    scope: error.scope,
    message: error.message,
    context: makeJsonSafe(error.context),
  }),
});

export const ReactLayoutError = createReactLayoutError.Error;
