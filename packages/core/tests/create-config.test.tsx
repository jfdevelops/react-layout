import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createProp, defineResourceLayout } from '../src';

describe('defineResourceLayout', () => {
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
