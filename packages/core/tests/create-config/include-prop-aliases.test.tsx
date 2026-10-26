import { render, screen } from '@testing-library/react';
import { expect, expectTypeOf, it } from 'vitest';
import { createDefinedResourceLayout, createProp } from '../../src';

it.each([
  {
    name: 'new names',
    component: { required: false, suppliedVia: 'component' },
    config: { required: true, suppliedVia: 'config' },
  },
  {
    name: 'deprecated names',
    component: { visibility: 'optional', passthrough: 'component' },
    config: { visibility: 'required', passthrough: 'config' },
  },
  {
    name: 'mixed requirement',
    component: { required: false, passthrough: 'component' },
    config: { required: true, passthrough: 'config' },
  },
  {
    name: 'mixed supply source',
    component: { visibility: 'optional', suppliedVia: 'component' },
    config: { visibility: 'required', suppliedVia: 'config' },
  },
  {
    name: 'new names take precedence',
    component: {
      required: false,
      visibility: 'required',
      suppliedVia: 'component',
      passthrough: 'config',
    },
    config: {
      required: true,
      visibility: 'optional',
      suppliedVia: 'config',
      passthrough: 'component',
    },
  },
] as const)('supports $name for included props', ({ component, config }) => {
  const factory = createDefinedResourceLayout({
    resources: ['users'],
    options: { label: createProp.string(), title: createProp.string() },
    props: { include: { label: component, title: config } },
  });
  const definition = factory.defineResourceLayout({
    render: {
      default: ({ label, title }) => {
        expectTypeOf(label).toEqualTypeOf<string | undefined>();
        expectTypeOf(title).toEqualTypeOf<string>();
        return (
          <p>
            {title}: {label}
          </p>
        );
      },
      Preview: {
        props: { include: { label: component, title: config } },
        render: ({ label, title }) => {
          expectTypeOf(label).toEqualTypeOf<string | undefined>();
          expectTypeOf(title).toEqualTypeOf<string>();
          return (
            <p>
              Preview {title}: {label}
            </p>
          );
        },
      },
    },
  });
  const Users = definition.createResourceLayout({
    resource: 'users',
    name: 'Users',
    title: 'Configured',
    label: 'Default',
  });
  expectTypeOf(Users).toBeCallableWith({});
  const view = render(<Users />);
  expect(screen.getByText('Configured: Default')).toBeInTheDocument();
  view.rerender(<Users label="Component" />);
  expect(screen.getByText('Configured: Component')).toBeInTheDocument();
  view.rerender(<Users.Preview label="Preview component" />);
  expect(
    screen.getByText('Preview Configured: Preview component')
  ).toBeInTheDocument();
  view.unmount();
  () => {
    // @ts-expect-error required config props must be supplied during creation
    definition.createResourceLayout({
      resource: 'users',
      name: 'MissingTitle',
    });
    // @ts-expect-error config props are not accepted as component props
    Users({ title: 'Wrong source' });
  };
});
