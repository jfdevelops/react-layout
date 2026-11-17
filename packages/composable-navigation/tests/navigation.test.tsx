import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  collectComposablePresetEntries,
  composablePresetMetaKey,
} from '@jfdevelops/react-layout-composables';
import { createBreadcrumbComposable, createTabsComposable } from '../src';
import { createNavigationComposable } from '../src/contract';
import type { NavigationItems } from '../src';

function labels(items: NavigationItems) {
  return Object.values(items)
    .map((item) => (typeof item === 'string' ? item : item.value))
    .join(' / ');
}

describe('navigation contract', () => {
  it('renders items with destinations and state', () => {
    const { Navigation } = createNavigationComposable(({ items }) => (
      <nav>
        {Object.entries(items).map(([key, item]) =>
          typeof item === 'string' ? (
            <span key={key}>{item}</span>
          ) : (
            <a
              key={key}
              href={item.href}
              aria-current={item.isActive ? 'page' : undefined}
              aria-disabled={item.isDisabled}
            >
              {item.value}
            </a>
          ),
        )}
      </nav>
    ));

    render(
      <Navigation
        items={{
          home: 'Home',
          users: {
            value: 'Users',
            href: '/users',
            isActive: true,
          },
        }}
      />,
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'Users',
      }),
    ).toHaveAttribute('href', '/users');
    expect(
      screen.getByRole('link', {
        name: 'Users',
      }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('rejects items that do not match the contract', () => {
    const { Navigation } = createNavigationComposable(() => null);

    expect(() =>
      render(
        createElement(Navigation, {
          items: {
            users: {
              href: '/users',
            },
          },
        } as never),
      ),
    ).toThrow(/Invalid prop "items/);
  });

  it('derives a list with its own name and prop', () => {
    const { Steps } = createNavigationComposable.extend({
      name: 'Steps',
      rename: {
        items: 'steps',
      },
    })(({ steps }) => <ol>{labels(steps)}</ol>);

    render(
      <Steps
        steps={{
          account: 'Account',
          billing: 'Billing',
        }}
      />,
    );
    expect(screen.getByText('Account / Billing')).toBeInTheDocument();
    expect(Steps.displayName).toBe('Steps');
  });
});

describe('navigation presets', () => {
  it('names breadcrumb items segments and tab items tabs', () => {
    const { Breadcrumb } = createBreadcrumbComposable(({ segments }) => (
      <nav aria-label='Breadcrumb'>{labels(segments)}</nav>
    ));
    const { Tabs } = createTabsComposable(({ tabs }) => (
      <nav aria-label='Tabs'>{labels(tabs)}</nav>
    ));

    render(
      <>
        <Breadcrumb
          segments={{
            users: 'Users',
            ada: 'Ada',
          }}
        />
        <Tabs
          tabs={{
            profile: 'Profile',
            activity: 'Activity',
          }}
        />
      </>,
    );
    expect(screen.getByLabelText('Breadcrumb')).toHaveTextContent(
      'Users / Ada',
    );
    expect(screen.getByLabelText('Tabs')).toHaveTextContent(
      'Profile / Activity',
    );
  });

  it('shares the contract definition under separate prop names', () => {
    const breadcrumb = createBreadcrumbComposable(() => null);
    const tabs = createTabsComposable(() => null);

    expect(createBreadcrumbComposable.props.segments).toBe(
      createNavigationComposable.props.items,
    );
    expect(tabs.Tabs[composablePresetMetaKey].props.tabs).toBe(
      createNavigationComposable.props.items,
    );
    expect(
      collectComposablePresetEntries({
        ...breadcrumb,
        ...tabs,
      }).map(({ key, props }) => [key, Object.keys(props)]),
    ).toEqual([
      ['Breadcrumb', ['segments']],
      ['Tabs', ['tabs']],
    ]);
  });
});
