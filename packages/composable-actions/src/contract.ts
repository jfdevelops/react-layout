import {
  builtIn,
  createPropValidator,
  defineComposableComponent,
} from '@jfdevelops/react-layout-composables';
import { defaultIntents, InvalidIntentError, isIntent } from './intent';

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
      actions: builtIn.record(
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
      ),
    },
  }));

const actionsSchema = createActionsComposable.getSchema('actions');

/** Actions keyed by a stable id. */
export type Actions = typeof actionsSchema.infer;

/** One link-style action: its label, destination, and presentation. */
export type Action = Actions[string];
