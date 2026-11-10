import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { createDefinedResourceLayout, createProp, defineResourceLayout } from '../../src';
import { renderCapturingError } from './helpers';

afterEach(cleanup);

describe('default render children', () => {
  it('passes children to plain layouts and inline and reusable render states', () => {
    const factory = createDefinedResourceLayout({
      resources: ['users'],
    });
    const Preview = factory.createRenderState({
      state: 'Preview',
      render: ({ children }) => {
        expectTypeOf(children).toEqualTypeOf<ReactNode>();

        return <aside>{children ?? 'Empty preview'}</aside>;
      },
    });
    const Users = factory
      .defineResourceLayout({
        render: {
          default: ({ children }) => <main>{children ?? 'Empty layout'}</main>,
          Loading: {
            render: ({ children }) => {
              expectTypeOf(children).toEqualTypeOf<ReactNode>();

              return <div>{children ?? 'Loading'}</div>;
            },
          },
          ...Preview,
        },
      })
      .createResourceLayout({
        resource: 'users',
        name: 'Users',
      });
    const view = render(
      <Users>
        <span>Page content</span>
      </Users>,
    );
    expect(screen.getByText('Page content')).toBeInTheDocument();
    view.rerender(<Users />);
    expect(screen.getByText('Empty layout')).toBeInTheDocument();
    view.rerender(<Users.Preview>Preview content</Users.Preview>);
    expect(screen.getByText('Preview content')).toBeInTheDocument();
    view.rerender(<Users.Loading>Loading content</Users.Loading>);
    expect(screen.getByText('Loading content')).toBeInTheDocument();
  });

  it('requires shorthand children on layouts and explicit states, with runtime validation', () => {
    const factory = createDefinedResourceLayout({
      resources: ['users'],
    });
    const Preview = factory.createRenderState({
      state: 'Preview',
      props: {
        custom: {
          children: 'required',
        },
      },
      render: ({ children }) => <aside>{children}</aside>,
    });
    const Users = factory
      .defineResourceLayout({
        props: {
          custom: {
            children: 'required',
          },
        },
        render: {
          default: ({ children }) => <main>{children}</main>,
          ...Preview,
        },
      })
      .createResourceLayout({
        resource: 'users',
        name: 'Users',
      });
    const view = render(<Users>Required content</Users>);
    expect(screen.getByText('Required content')).toBeInTheDocument();
    view.unmount();
    const missing = renderCapturingError(createElement(Users, {} as never));
    expect(missing?.message).toContain('children');
    const missingState = renderCapturingError(createElement(Users.Preview, {} as never));
    expect(missingState?.message).toContain('children');
  });

  it('provides the shell content region as props.children', () => {
    const { Shell } = defineResourceLayout.withLayout({
      resources: ['users'],
      shell: {
        render: ({ children }) => <main>{children ?? 'Empty shell'}</main>,
      },
    });
    const view = render(
      <Shell>
        <span>Shell content</span>
      </Shell>,
    );
    expect(screen.getByText('Shell content')).toBeInTheDocument();
    view.rerender(<Shell />);
    expect(screen.getByText('Empty shell')).toBeInTheDocument();
  });

  it('validates required shell children', () => {
    const { Shell } = defineResourceLayout.withLayout({
      resources: ['users'],
      shell: {
        props: {
          custom: {
            children: 'required',
          },
        },
        render: ({ children }) => <main>{children}</main>,
      },
    });
    const view = render(<Shell>Required shell content</Shell>);
    expect(screen.getByText('Required shell content')).toBeInTheDocument();
    view.unmount();
    expect(renderCapturingError(createElement(Shell, {} as never))?.message).toContain('children');
  });

  it.each([false, true])(
    'retains shell resource reporting with shorthand required = %s',
    (required) => {
      const { Shell, createResourceLayout } = defineResourceLayout.withLayout({
        resources: ['users'],
        shell: {
          props: required
            ? {
                custom: {
                  children: 'required' as const,
                },
              }
            : undefined,
          render: ({ children }, { resources }) => (
            <main>
              <span data-testid='current-resource'>{resources.current ?? 'none'}</span>
              {children}
            </main>
          ),
        },
        layout: {
          render: () => <p>Page</p>,
        },
      });
      const Users = createResourceLayout({
        resource: 'users',
        name: 'Users',
      });
      render(
        <Shell>
          <Users />
        </Shell>,
      );
      expect(screen.getByTestId('current-resource')).toHaveTextContent('users');
    },
  );

  it('preserves explicitly validated string children in shell render props', () => {
    const { Shell } = defineResourceLayout.withLayout({
      resources: ['users'],
      shell: {
        props: {
          custom: {
            children: createProp.string(),
          },
        },
        render: ({ children }) => {
          expectTypeOf(children).toEqualTypeOf<string>();

          return <header>{children.toUpperCase()}</header>;
        },
      },
    });
    render(<Shell>Title</Shell>);
    expect(screen.getByText('TITLE')).toBeInTheDocument();
  });

  it('preserves optional validator-based shell children when supplied or omitted', () => {
    const { Shell } = defineResourceLayout.withLayout({
      resources: ['users'],
      shell: {
        props: {
          custom: {
            children: createProp.string().optional(),
          },
        },
        render: ({ children }) => <header>{children?.toUpperCase() ?? 'Empty'}</header>,
      },
    });
    const view = render(<Shell>Title</Shell>);
    expect(screen.getByText('TITLE')).toBeInTheDocument();
    view.rerender(<Shell />);
    expect(screen.getByText('Empty')).toBeInTheDocument();
  });

  it('preserves children through derived states and deferred renders', async () => {
    const factory = createDefinedResourceLayout({
      resources: ['users'],
    });
    const Source = factory.createRenderState({
      state: 'Source',
      props: {
        custom: {
          children: 'required',
        },
      },
      render: ({ children }) => <aside>{children}</aside>,
    });
    const Derived = factory.createRenderState.fromState({
      ref: Source,
      state: 'Derived',
      render: ({ children }, { composables }) => <composables.Ref>{children}</composables.Ref>,
    });
    const Deferred = factory.createRenderState.defer({
      state: 'Deferred',
      render: ({ children }) => <section>{children}</section>,
    });
    const Users = factory
      .defineResourceLayout({
        render: {
          default: () => <></>,
          ...Derived,
          ...Deferred,
        },
      })
      .createResourceLayout({
        resource: 'users',
        name: 'Users',
      });
    const view = render(<Users.Derived>Derived content</Users.Derived>);
    expect(screen.getByText('Derived content')).toBeInTheDocument();
    view.rerender(<Users.Deferred>Deferred content</Users.Deferred>);
    expect(await screen.findByText('Deferred content')).toBeInTheDocument();
  });

  it('requires children on scoped components and supplies children to resource renders', () => {
    const { createResourceLayout } = defineResourceLayout({
      resources: ['users'],
      layout: {
        render: ({ children }) => <main>{children}</main>,
      },
    });
    const Directory = createResourceLayout.forResources('users').createComponent({
      props: {
        custom: {
          children: 'required',
        },
      },
      resources: {
        users: {
          render: ({ children }) => <aside>{children}</aside>,
        },
      },
      render: ({ children }, { Users }) => <Users>{children}</Users>,
    });
    const view = render(<Directory resource='users'>Scoped content</Directory>);
    expect(screen.getByText('Scoped content')).toBeInTheDocument();
    view.unmount();
    expect(
      renderCapturingError(
        createElement(Directory, {
          resource: 'users',
        } as never),
      )?.message,
    ).toContain('children');
  });

  it('passes children to path-based render callbacks', () => {
    const { createResourceConfig } = defineResourceLayout({
      resources: ['users'],
      layout: {
        render: () => <></>,
      },
    });
    const config = createResourceConfig({
      users: {
        component: <div />,
      },
    });
    const PathView = config.forPaths('users').render(({ children }) => <main>{children}</main>);
    render(<PathView>Path content</PathView>);
    expect(screen.getByText('Path content')).toBeInTheDocument();
  });
});
