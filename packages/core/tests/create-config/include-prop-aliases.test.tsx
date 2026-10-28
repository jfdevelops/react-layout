import { getIncludedPropBehavior } from '../../src/props';
import { render, screen } from '@testing-library/react';
import { expect, expectTypeOf, it } from 'vitest';
import {
  createDefinedResourceLayout,
  createProp,
  type IncludedPropBehavior,
} from '../../src';

it('supports canonical include requirements and supply sources', () => {
  const component = { required: false, suppliedVia: 'component' } as const;
  const config = { required: true, suppliedVia: 'config' } as const;
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
    screen.getByText('Preview Configured: Preview component'),
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

it('rejects removed include aliases at runtime and in public types', () => {
  expect(() =>
    getIncludedPropBehavior({ visibility: 'required', passthrough: 'config' }),
  ).toThrow('removed');
  expect(() =>
    getIncludedPropBehavior({
      required: true,
      suppliedVia: 'config',
      visibility: 'required',
    }),
  ).toThrow('removed');
  () => {
    const oldRequirement: IncludedPropBehavior = {
      required: true,
      suppliedVia: 'config',
      // @ts-expect-error visibility was removed in version 2
      visibility: 'required',
    };
    const oldSupply: IncludedPropBehavior = {
      required: true,
      suppliedVia: 'config',
      // @ts-expect-error passthrough was removed in version 2
      passthrough: 'component',
    };
    return [oldRequirement, oldSupply];
  };
});

it('removes the deprecated resource context field while preserving the resource accessor', () => {
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  const definition = factory.defineResourceLayout({
    render: (_, context) => {
      expect(Object.hasOwn(context, 'resource')).toBe(false);
      expectTypeOf(context.resources.current).toEqualTypeOf<'users'>();
      () => {
        // @ts-expect-error use resources.current in render contexts
        context.resource;
      };
      return <p>{context.resources.current}</p>;
    },
  });
  const Users = definition.createResourceLayout({
    resource: 'users',
    name: 'Users',
  });
  const view = render(<Users />);
  expect(screen.getByText('users')).toBeInTheDocument();
  view.unmount();
});
