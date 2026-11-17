# Access composable

A preset composable for what a page requires before its content is shown. It
ships its props, so a page declares its requirements and your render callback
checks them against your own auth.

```tsx
import { createAccessComposable } from '@jfdevelops/react-layout-composable-access';

composables: (create) => ({
  Layout: create({ name: 'Layout' }),
  ...createAccessComposable(({ roles, permissions, flag, children }) => (
    <AppGuard roles={roles} permissions={permissions} flag={flag}>
      {children}
    </AppGuard>
  )),
});
```

| Prop           | Type       | Meaning                             |
| -------------- | ---------- | ----------------------------------- |
| `roles?`       | `string[]` | Roles that may view the page        |
| `permissions?` | `string[]` | Permissions the viewer needs        |
| `flag?`        | `string`   | Feature flag that must be turned on |

Every prop is optional, so a page with no requirements declares nothing. The
composable does not check anything itself.

## The contract

The preset is the access contract itself, also exported from the `/contract`
entry point for `extend`:

```tsx
import { createAccessComposable } from '@jfdevelops/react-layout-composable-access/contract';

export const createGuardComposable = createAccessComposable.extend({
  name: 'Guard',
});
```
