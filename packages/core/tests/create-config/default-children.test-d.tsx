import type { ReactNode } from 'react';
import { expectTypeOf } from 'vitest';
import { createDefinedResourceLayout, createProp } from '../../src';

const factory = createDefinedResourceLayout({ resources: ['users'] });
const Users = factory
  .defineResourceLayout({
    render: ({ children }) => {
      expectTypeOf(children).toEqualTypeOf<ReactNode>();
      return <main>{children}</main>;
    },
  })
  .createResourceLayout({ resource: 'users', name: 'Users' });
<Users />;
<Users>Content</Users>;
// @ts-expect-error Built-in children must be React content.
<Users children={{ invalid: true }} />;

const Required = factory
  .defineResourceLayout({
    props: { custom: { children: 'required', title: createProp.string() } },
    render: ({ children, title }) => (
      <main>
        {title}
        {children}
      </main>
    ),
  })
  .createResourceLayout({ resource: 'users', name: 'Required' });
<Required title="Title">Content</Required>;
// @ts-expect-error Explicit required children must be supplied.
<Required title="Title" />;

const Preview = factory.createRenderState({
  state: 'Preview',
  props: { custom: { children: 'required' } },
  render: ({ children }) => <aside>{children}</aside>,
});
const States = factory
  .defineResourceLayout({ render: { default: () => <></>, ...Preview } })
  .createResourceLayout({ resource: 'users', name: 'States' });
<States.Preview>Content</States.Preview>;
// @ts-expect-error State-local required children must be supplied.
<States.Preview />;
const PreviewComposable = Preview.asComposable();
// @ts-expect-error Standalone state composables retain required children.
<PreviewComposable />;

factory.defineResourceLayout({
  // @ts-expect-error The required shorthand is reserved for children.
  props: { custom: { title: 'required' } },
  render: () => <></>,
});
// @ts-expect-error Children shorthand only supports required.
factory.createRenderState({
  state: 'Preview',
  props: { custom: { children: 'yes' } },
  render: () => <></>,
});

// @ts-expect-error Optional children are implicit, not an explicit shorthand.
factory.createRenderState({
  state: 'Preview',
  props: { custom: { children: 'optional' } },
  render: () => <></>,
});
