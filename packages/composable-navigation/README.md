# Navigation composables

Preset composables for lists of navigation items. Each one ships its props, so
a page supplies the items and your render callback supplies the markup.

```tsx
import {
  createBreadcrumbComposable,
  createTabsComposable,
} from '@jfdevelops/react-layout-composable-navigation';

composables: (create) => ({
  Layout: create({ name: 'Layout' }),
  ...createBreadcrumbComposable(({ segments }) => (
    <AppBreadcrumb segments={segments} />
  )),
  ...createTabsComposable(({ tabs }) => <AppTabs tabs={tabs} />),
});
```

| Factory                      | Component    | Prop       |
| ---------------------------- | ------------ | ---------- |
| `createBreadcrumbComposable` | `Breadcrumb` | `segments` |
| `createTabsComposable`       | `Tabs`       | `tabs`     |

Both props use the same item record, keyed by a stable id:

```ts
type NavigationItem =
  | string
  | { value: string; href?: string; isActive?: boolean; isDisabled?: boolean };
```

## The contract

Both presets are built from the navigation contract, exported from the
`/contract` entry point. Use it directly for a list named `items`, or `extend`
it for a list with its own component and prop name:

```tsx
import { createNavigationComposable } from '@jfdevelops/react-layout-composable-navigation/contract';

export const createStepsComposable = createNavigationComposable.extend({
  name: 'Steps',
  rename: { items: 'steps' },
});
```

The item definition is available as `createNavigationComposable.props.items`.

Every factory also accepts the object overload from
`defineComposableComponent`, including `rename`, `props`, `name`, and
`wrapWith`.
