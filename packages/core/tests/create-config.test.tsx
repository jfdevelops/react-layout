import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createProp, defineResourceLayout } from '../src';

describe('defineResourceLayout', () => {
  afterEach(() => {
    cleanup();
  });

  it('creates layouts bound to a resource and uses the provided default name', () => {
    const createResourceLayout = defineResourceLayout({
      resources: ['users', 'posts'],
      options: {
        title: createProp.string(),
      },
      layout: {
        props: {
          include: {
            title: true,
          },
        },
        render: (props, context) => (
          <section>
            <span>{context.name}</span>
            <span>{context.resource}</span>
            <h1>{props.title}</h1>
          </section>
        ),
      },
    });

    const createUsersPage = createResourceLayout.forResource({
      resource: 'users',
      name: 'UsersPage',
    });
    const UsersPage = createUsersPage({
      title: 'Directory',
    });

    render(<UsersPage />);

    expect(screen.getByText('UsersPage')).toBeInTheDocument();
    expect(screen.getByText('users')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Directory' })).toBeInTheDocument();
  });

  it('allows overriding the default name for a resource-bound layout', () => {
    const createResourceLayout = defineResourceLayout({
      resources: ['users'],
      options: {},
      layout: {
        render: (_props, context) => (
          <section>
            <span>{context.name}</span>
            <span>{context.resource}</span>
          </section>
        ),
      },
    });

    const createUsersPage = createResourceLayout.forResource({
      resource: 'users',
      name: 'UsersPage',
    });
    const CustomUsersPage = createUsersPage({
      name: 'CustomUsersPage',
    });

    render(<CustomUsersPage />);

    expect(screen.getByText('CustomUsersPage')).toBeInTheDocument();
    expect(screen.getByText('users')).toBeInTheDocument();
  });

  it('throws when forResource is called without a resource', () => {
    const createResourceLayout = defineResourceLayout({
      resources: ['users'],
      options: {},
      layout: {
        render: () => <section />,
      },
    });

    expect(() =>
      createResourceLayout.forResource({ name: 'UsersPage' } as never),
    ).toThrowError('"resource" is required when calling "forResource"');
  });

  it('resolves included option props before passing them to render', () => {
    const createResourceLayout = defineResourceLayout({
      resources: ['users'],
      options: {
        title: createProp.string(),
        description: createProp.string(),
      },
      layout: {
        props: {
          include: {
            title: true,
            description: true,
          },
          custom: {
            children: createProp.component({ type: 'ReactNode' }),
          },
        },
        render: (props) => (
          <section>
            <h1>{props.title}</h1>
            <p>{props.description}</p>
            <div>{props.children}</div>
          </section>
        ),
      },
    });

    const UsersPage = createResourceLayout({
      resource: 'users',
      name: 'UsersPage',
      title: 'Users page',
      description: 'Resolved include props should reach render as strings.',
    });

    render(<UsersPage>Body content</UsersPage>);

    expect(screen.getByRole('heading', { name: 'Users page' }).textContent).toBe(
      'Users page',
    );
    expect(
      screen.getByText('Resolved include props should reach render as strings.')
        .textContent,
    ).toBe('Resolved include props should reach render as strings.');
    expect(screen.getByText('Body content').textContent).toBe('Body content');
  });

  it('passes split render options through the render context', () => {
    const createResourceLayout = defineResourceLayout({
      resources: ['users'],
      options: {
        title: createProp.string(),
      },
      layout: {
        props: {
          include: {
            title: true,
          },
        },
        render: (props, context) => (
          <section>
            <span>{context.name}</span>
            <span>{context.resource}</span>
            <span>{props.title}</span>
            <span>{String(Object.keys(context.inProps).length)}</span>
          </section>
        ),
      },
    });

    const UsersPage = createResourceLayout({
      resource: 'users',
      name: 'UsersPage',
      title: 'Directory',
    });

    render(<UsersPage />);

    expect(screen.getByText('UsersPage')).toBeInTheDocument();
    expect(screen.getByText('users')).toBeInTheDocument();
    expect(screen.getByText('Directory')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
