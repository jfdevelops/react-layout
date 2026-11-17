import { createError } from '@jfdevelops/create-error';
import { builtIn } from '@jfdevelops/react-layout-composables';
import type { StandardSchemaV1 } from '@jfdevelops/react-layout-validator';

/** One of the default intents: how prominent an action is, or that it is destructive. */
export type ActionIntent = (typeof defaultIntents)[number];

export const defaultIntents = ['primary', 'destructive'] as const;

export function isIntent<Intent extends string>(
  value: unknown,
  intents: ReadonlyArray<Intent>,
): value is Intent {
  return intents.includes(value as Intent);
}

const actionsErrorFactory = createError({
  definition: builtIn.object({
    code: builtIn.string,
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

const invalidIntentContext = builtIn.object({
  action: builtIn.string,
  intent: builtIn.unknown,
  intents: builtIn.array(builtIn.string),
});

export type InvalidIntentContext = StandardSchemaV1.InferOutput<
  typeof invalidIntentContext
>;

/** Thrown when an action's intent is not one of the known intents. */
export class InvalidIntentError extends actionsErrorFactory({
  code: 'invalidIntent',
})
  .defineContext(invalidIntentContext)
  .implement(
    ({ action, intent, intents }) =>
      `"${action}" has the intent ${JSON.stringify(intent)}; expected ${intents.join(', ')}`,
  ) {}
