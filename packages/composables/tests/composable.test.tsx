import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createProp } from '@jfdevelops/react-layout-validator';
import {
  createComposableComponent,
  defineComposableComponent,
  makeComposable,
} from '../src';

describe('composable helpers', () => {
  it('renders resolved out props into function children', () => {
    const Badge = createComposableComponent({
      name: 'Badge',
      inProps: {
        tone: createProp.string().literal('info'),
      },
      outProps: () => ({
        label: 'Admin',
      }),
    });

    render(
      <div>
        {Badge({
          tone: 'info',
          children: ({ label }: { label: string }) => <span>{label}</span>,
        })}
      </div>,
    );

    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(Badge.displayName).toBe('Badge');
  });

  it('returns a composable record keyed by name', () => {
    const createBreadcrumbComposable = defineComposableComponent({
      name: 'Breadcrumb',
      props: {
        foo: createProp.string(),
      },
    });

    const Breadcrumb = createBreadcrumbComposable(({ foo }) => <>{foo}</>);

    expect(createBreadcrumbComposable.props).toHaveProperty('foo');
    expect(Breadcrumb).toHaveProperty('Breadcrumb');
    expect(Breadcrumb.Breadcrumb.displayName).toBe('Breadcrumb');
  });

  it('composes a layout from available composables', () => {
    const createUsersLayout = makeComposable<{}>()({
      name: 'UsersLayout',
      components: {
        Header: createComposableComponent({
          name: 'Header',
        }),
        Layout: createComposableComponent({
          name: 'Layout',
        }),
      },
    });
    const UsersLayout = createUsersLayout();

    expect(UsersLayout.displayName).toBe('UsersLayout');
    expect(UsersLayout.Header.displayName).toBe('Header');
  });

  it('allows calling makeComposable without options when all options are defined', () => {
    const createUsersLayout = makeComposable<{}>()({
      name: 'UsersLayout',
      components: {
        Layout: createComposableComponent({
          name: 'Layout',
        }),
      },
    });
    const UsersLayout = createUsersLayout();
    const SameLayout = createUsersLayout({});

    expect(UsersLayout.displayName).toBe('UsersLayout');
    expect(SameLayout.displayName).toBe('UsersLayout');
  });
});
