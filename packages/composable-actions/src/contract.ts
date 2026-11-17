import {
  createPropValidator,
  defineComposableComponent,
  type PropValidatorErrorHelper,
} from '@jfdevelops/react-layout-composables';
import { defaultIntents, InvalidIntentError, isIntent } from './intent';

/** One link-style action: its label, destination, and presentation. */
export type Action<Intent extends string = string> = {
  value: string;
  href?: string;
  intent?: Intent;
  isDisabled?: boolean;
};

/** Actions keyed by a stable id. */
export type Actions<Intent extends string = string> = Record<
  string,
  Action<Intent>
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptional(value: unknown, type: 'boolean' | 'string') {
  return value === undefined || typeof value === type;
}

function hasActionShape(action: unknown): action is Record<string, unknown> {
  return (
    isRecord(action) &&
    typeof action.value === 'string' &&
    isOptional(action.href, 'string') &&
    isOptional(action.isDisabled, 'boolean')
  );
}

function assertActions<Intent extends string>(
  value: unknown,
  intents: ReadonlyArray<Intent>,
  error: PropValidatorErrorHelper,
): asserts value is Actions<Intent> {
  if (!isRecord(value)) {
    throw error('Expected actions keyed by id');
  }

  for (const [key, action] of Object.entries(value)) {
    if (!hasActionShape(action)) {
      throw error(`"${key}" is not an action`);
    }

    InvalidIntentError.invariant(
      action.intent === undefined || isIntent(action.intent, intents),
      () => ({
        action: key,
        intent: action.intent,
        intents: [...intents],
      }),
    );
  }
}

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
      actions: createPropValidator(({ value, error }) => {
        assertActions(value, intents, error);

        return value;
      }),
    },
  }));
