import type { StandardSchemaV1 } from '@jfdevelops/react-layout-validator';
import {
  builtIn,
  createPropValidator,
  defineComposableComponent,
} from '@jfdevelops/react-layout-composables';
import { defaultIntents, InvalidIntentError, isIntent } from './intent';

function createActionsDefinition(intents: ReadonlyArray<string>) {
  return builtIn.record(
    builtIn.object({
      value: builtIn.string,
      href: builtIn.string.optional(),
      intent: createPropValidator(({ value }) => {
        InvalidIntentError.invariant(isIntent(value, intents), () => ({
          intent: value,
          intents: [...intents],
        }));

        return value;
      }).optional(),
      isDisabled: builtIn.boolean.optional(),
    }),
  );
}

/** Actions keyed by a stable id. */
export type Actions = StandardSchemaV1.InferOutput<
  ReturnType<typeof createActionsDefinition>
>;

/** One link-style action: its label, destination, and presentation. */
export type Action = Actions[string];

/**
 * The actions contract. Call it for a list named `actions`, or `extend` it to
 * give the list its own component and prop name. Pass `intents` to choose
 * which intents an action may have.
 */
export const createActionsComposable = defineComposableComponent
  .defineContext({
    intents: {
      value: defaultIntents,
    },
  })
  .handler(({ intents }) => ({
    name: 'Actions',
    props: {
      actions: createActionsDefinition(intents),
    },
  }));
