import type { ReactNode } from 'react';
import { expectTypeOf } from 'vitest';
import { createDefinedResourceLayout } from '../../src';
import { z } from 'zod';

const factory = createDefinedResourceLayout({
  resources: ['users'],
});
const Users = factory
  .defineResourceLayout({
    render: ({ children }) => {
      expectTypeOf(children).toEqualTypeOf<ReactNode>();

      return <main>{children}</main>;
    },
  })
  .createResourceLayout({
    resource: 'users',
    name: 'Users',
  });
<Users />;
<Users>Content</Users>;
<Users
  children={{
    // @ts-expect-error Built-in children must be React content.
    invalid: true,
  }}
/>;

const Required = factory
  .defineResourceLayout({
    props: {
      custom: {
        children: 'required',
        title: z.string(),
      },
    },
    render: ({ children, title }) => (
      <main>
        {title}
        {children}
      </main>
    ),
  })
  .createResourceLayout({
    resource: 'users',
    name: 'Required',
  });
<Required title='Title'>Content</Required>;
// @ts-expect-error Explicit required children must be supplied.
<Required title='Title' />;

const Preview = factory.createRenderState({
  state: 'Preview',
  props: {
    custom: {
      children: 'required',
    },
  },
  render: ({ children }) => <aside>{children}</aside>,
});
const States = factory
  .defineResourceLayout({
    render: {
      default: () => <></>,
      ...Preview,
    },
  })
  .createResourceLayout({
    resource: 'users',
    name: 'States',
  });
<States.Preview>Content</States.Preview>;
// @ts-expect-error State-local required children must be supplied.
<States.Preview />;
const PreviewComposable = Preview.asComposable();
// @ts-expect-error Standalone state composables retain required children.
<PreviewComposable />;

factory.defineResourceLayout({
  props: {
    custom: {
      // @ts-expect-error The required shorthand is reserved for children.
      title: 'required',
    },
  },
  render: () => <></>,
});
const invalidOptions1 = {
  state: 'Preview',
  props: {
    custom: {
      children: 'yes',
    },
  },
  render: () => <></>,
} as const;

// @ts-expect-error Children shorthand only supports required.
factory.createRenderState(invalidOptions1);

const invalidOptions2 = {
  state: 'Preview',
  props: {
    custom: {
      children: 'optional',
    },
  },
  render: () => <></>,
} as const;

// @ts-expect-error Optional children are implicit, not an explicit shorthand.
factory.createRenderState(invalidOptions2);

const Structured = factory
  .defineResourceLayout({
    props: {
      custom: {
        children: z.object({
          label: z.string(),
        }),
      },
    },
    render: ({ children }) => <p>{children.label}</p>,
  })
  .createResourceLayout({
    resource: 'users',
    name: 'Structured',
  });

<Structured
  children={{
    label: 'Explicit type',
  }}
/>;
// @ts-expect-error An explicit required schema replaces optional default children.
<Structured />;
// @ts-expect-error An explicit object schema replaces ReactNode.
<Structured>React content</Structured>;
