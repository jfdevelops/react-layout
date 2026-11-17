# Page copy composables

Preset composables for a page's title and description. Each one ships its
props, so a page supplies the copy and your render callback supplies the
markup.

```tsx
import {
  createHeaderComposable,
  createMetaComposable,
} from '@jfdevelops/react-layout-composable-copy';

composables: (create) => ({
  Layout: create({ name: 'Layout' }),
  ...createHeaderComposable(({ eyebrow, title, description }) => (
    <AppHeader eyebrow={eyebrow} title={title} description={description} />
  )),
  ...createMetaComposable(({ title, description }) => (
    <AppHead title={title} description={description} />
  )),
});
```

| Factory                  | Component | Props                                                           |
| ------------------------ | --------- | --------------------------------------------------------------- |
| `createHeaderComposable` | `Header`  | `title`, `description?`, `eyebrow?`                             |
| `createMetaComposable`   | `Meta`    | `title`, `description?`, `canonical?`, `image?`, `isIndexable?` |

`title` and `description` are the same definitions in both presets, so a page
supplies each value once and both composables receive it. Every value is text,
because a document title cannot be a React node.

To give one preset its own value, rename its prop. An object entry also
replaces the definition:

```tsx
createHeaderComposable({
  rename: { title: { name: 'heading', schema: reactNode() } },
  render: ({ heading }) => <h1>{heading}</h1>,
});
```

## The contract

Both presets are built from the copy contract, exported from the `/contract`
entry point with the `copyText` validator it uses:

```tsx
import {
  copyText,
  createCopyComposable,
} from '@jfdevelops/react-layout-composable-copy/contract';

export const createNoticeComposable = createCopyComposable.extend({
  name: 'Notice',
  props: {
    tone: copyText.optional(),
    isDismissible: ({ value }) => value === true,
  },
});
```

The props are validated by plain functions, so the package needs no schema
library. A prop you add can be any Standard Schema or a function like the one
above: it receives the value as `unknown`, returns the validated value, and
throws to reject it.
