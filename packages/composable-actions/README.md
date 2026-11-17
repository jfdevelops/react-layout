# Actions composable

A preset composable for a page's link-style actions. It ships its props, so a
page supplies the actions and your render callback supplies the markup.

```tsx
import { createActionsComposable } from '@jfdevelops/react-layout-composable-actions';

composables: (create) => ({
  Layout: create({ name: 'Layout' }),
  ...createActionsComposable(({ actions }) => <AppActions actions={actions} />),
});
```

`actions` is a record keyed by a stable id:

```ts
type Action = {
  value: string;
  href?: string;
  intent?: string;
  isDisabled?: boolean;
};
```

The intents are `primary` and `destructive` by default. Choose your own in
the call, as a list that replaces the defaults or a function that receives
them:

```tsx
createActionsComposable({
  intents: (defaults) => [...defaults, 'ghost'],
  render: ({ actions }) => <AppActions actions={actions} />,
});
```

An action with any other intent is rejected: the `PropError` that reports
the `actions` prop has an `InvalidIntentError` as its `cause`, with the action,
the intent and the allowed intents in its `context`.
`intents` sits beside `rename`, `name` and the other options, and `extend`
accepts it too.

Actions are described when a page is created, so they cover links and other
declarative actions. Pass anything that needs a handler as an ordinary React
node.

## The contract

The preset is the actions contract itself, also exported from the `/contract`
entry point. `extend` it for a second list with its own component and prop
name:

```tsx
import { createActionsComposable } from '@jfdevelops/react-layout-composable-actions/contract';

export const createShortcutsComposable = createActionsComposable.extend({
  name: 'Shortcuts',
  rename: { actions: 'shortcuts' },
});
```
