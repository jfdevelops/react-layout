import { expectTypeOf } from 'vitest';
import { createActionsComposable } from '../src';
import type { Action, Actions as ActionRecord } from '../src';

const { Actions } = createActionsComposable(({ actions }) => {
  expectTypeOf(actions).toEqualTypeOf<ActionRecord>();

  return null;
});

<Actions
  actions={{
    create: {
      value: 'New user',
      intent: 'primary',
    },
  }}
/>;
// @ts-expect-error Actions are required.
<Actions />;
<Actions
  actions={{
    // @ts-expect-error An action requires its label.
    create: {
      href: '/users/new',
    },
  }}
/>;
createActionsComposable({
  intents: ['primary', 'ghost'],
  render: ({ actions }) => {
    expectTypeOf(actions).toEqualTypeOf<ActionRecord>();

    return null;
  },
});
createActionsComposable({
  intents: (defaults) => {
    expectTypeOf(defaults).toEqualTypeOf<ReadonlyArray<string>>();

    return [...defaults, 'ghost'];
  },
  render: () => null,
});
createActionsComposable({
  // @ts-expect-error Intents are a list of names.
  intents: 'ghost',
  render: () => null,
});
createActionsComposable.extend({
  name: 'Shortcuts',
  intents: ['quiet'],
  rename: {
    actions: 'shortcuts',
  },
})(({ shortcuts }) => {
  expectTypeOf(shortcuts).toEqualTypeOf<ActionRecord>();

  return null;
});

expectTypeOf<Action>().toEqualTypeOf<{
  value: string;
  href?: string | undefined;
  intent?: string | undefined;
  isDisabled?: boolean | undefined;
}>();
expectTypeOf<ActionRecord>().toEqualTypeOf<Record<string, Action>>();
