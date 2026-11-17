import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import {
  createHeaderComposable,
  createMetaComposable,
} from '@jfdevelops/react-layout-composable-copy';
import {
  createBreadcrumbComposable,
  createTabsComposable,
  type NavigationItems,
} from '@jfdevelops/react-layout-composable-navigation';
import { ConflictingPresetPropError } from '@jfdevelops/react-layout-composables';
import { z } from 'zod';
import { defineComposableComponent, defineResourceLayout } from '../../src';

afterEach(cleanup);

function labels(items: NavigationItems) {
  return Object.values(items)
    .map((item) => (typeof item === 'string' ? item : item.value))
    .join(' / ');
}

it('supplies one title and description to the header and meta presets', () => {
  const { createResourceLayout } = defineResourceLayout({
    resources: ['users'],
    layout: {
      composables: () => ({
        ...createHeaderComposable(({ eyebrow, title, description }) => (
          <header>
            <span>{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </header>
        )),
        ...createMetaComposable(({ title, description, canonical }) => (
          <p>{`${title} | ${description} | ${canonical}`}</p>
        )),
      }),
      props: {
        include: {
          title: true,
          description: true,
          eyebrow: true,
          canonical: true,
        },
      },
      render: (props, { composables }) => (
        <main>
          <composables.Meta
            title={props.title}
            description={props.description}
            canonical={props.canonical}
          />
          <composables.Header
            title={props.title}
            description={props.description}
            eyebrow={props.eyebrow}
          />
        </main>
      ),
    },
  });
  const Users = createResourceLayout({
    resource: 'users',
    name: 'Users',
    title: 'Users',
    description: 'Manage users',
    eyebrow: 'Admin',
    canonical: '/users',
  });

  render(<Users />);
  expect(
    screen.getByRole('heading', {
      name: 'Users',
    }),
  ).toBeInTheDocument();
  expect(screen.getByText('Admin')).toBeInTheDocument();
  expect(screen.getByText('Manage users')).toBeInTheDocument();
  expect(screen.getByText('Users | Manage users | /users')).toBeInTheDocument();
});

it('supplies separate items to the breadcrumb and tabs presets', () => {
  const { createResourceLayout } = defineResourceLayout({
    resources: ['users'],
    layout: {
      composables: () => ({
        ...createBreadcrumbComposable(({ segments }) => (
          <nav aria-label='Breadcrumb'>{labels(segments)}</nav>
        )),
        ...createTabsComposable(({ tabs }) => (
          <nav aria-label='Tabs'>{labels(tabs)}</nav>
        )),
      }),
      props: {
        include: {
          segments: true,
          tabs: true,
        },
      },
      render: (props, { composables }) => (
        <main>
          <composables.Breadcrumb segments={props.segments} />
          <composables.Tabs tabs={props.tabs} />
        </main>
      ),
    },
  });
  const Users = createResourceLayout({
    resource: 'users',
    name: 'Users',
    segments: {
      users: 'Users',
      ada: {
        value: 'Ada',
        isActive: true,
      },
    },
    tabs: {
      profile: {
        value: 'Profile',
        href: '/users/ada',
      },
      activity: 'Activity',
    },
  });

  render(<Users />);
  expect(screen.getByLabelText('Breadcrumb')).toHaveTextContent('Users / Ada');
  expect(screen.getByLabelText('Tabs')).toHaveTextContent('Profile / Activity');
});

it('rejects presets that declare one prop with different definitions', () => {
  const createCount = defineComposableComponent({
    name: 'Count',
    props: {
      title: z.number(),
    },
  });
  const { createResourceLayout } = defineResourceLayout({
    resources: ['users'],
    layout: {
      composables: () => ({
        ...createHeaderComposable(({ title }) => <h1>{title}</h1>),
        ...createCount(({ title }) => <p>{title}</p>),
      }),
      render: () => <main />,
    },
  });

  expect(() =>
    createResourceLayout({
      resource: 'users',
      name: 'Users',
      title: 'Users' as never,
    }),
  ).toThrow(ConflictingPresetPropError);
});
