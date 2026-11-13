import type { ReactNode } from 'react';
import { expectTypeOf } from 'vitest';
import { z } from 'zod';
import {
  createDefinedResourceLayout,
  createPropsFromComponent,
} from '@jfdevelops/react-layout';

const factory = createDefinedResourceLayout({
  resources: ['users'],
});

export const DefaultChildren = factory
  .defineResourceLayout({
    render: ({ children }) => {
      expectTypeOf(children).toEqualTypeOf<ReactNode>();

      return <main>{children}</main>;
    },
  })
  .createResourceLayout({
    resource: 'users',
    name: 'DefaultChildren',
  });

export const inheritedChildren =
  createPropsFromComponent(DefaultChildren).pick('children');
export const defaultContent = <DefaultChildren>Content</DefaultChildren>;
export const omittedContent = <DefaultChildren />;

export const StructuredChildren = factory
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
    name: 'StructuredChildren',
  });

export const structuredContent = (
  <StructuredChildren>
    {{
      label: 'Structured',
    }}
  </StructuredChildren>
);
// @ts-expect-error The explicit schema replaces optional children.
export const missingContent = <StructuredChildren />;
export const incorrectContent = (
  // @ts-expect-error The explicit schema replaces ReactNode.
  <StructuredChildren>React content</StructuredChildren>
);

const readChildren = factory.createReusable({
  fn: ({ children }) => children,
});
expectTypeOf(readChildren()).toEqualTypeOf<ReactNode>();
export const reusableContent = readChildren({
  children: <span>Content</span>,
});
