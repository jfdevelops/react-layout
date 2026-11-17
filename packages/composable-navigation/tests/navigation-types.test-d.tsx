import { expectTypeOf } from 'vitest';
import { createBreadcrumbComposable, createTabsComposable } from '../src';
import { createNavigationComposable } from '../src/contract';
import type { NavigationItem, NavigationItems } from '../src';

const { Navigation } = createNavigationComposable(({ items }) => {
  expectTypeOf(items).toEqualTypeOf<NavigationItems>();

  return null;
});
const { Breadcrumb } = createBreadcrumbComposable(({ segments }) => {
  expectTypeOf(segments).toEqualTypeOf<NavigationItems>();

  return null;
});
const { Tabs } = createTabsComposable(({ tabs }) => {
  expectTypeOf(tabs).toEqualTypeOf<NavigationItems>();

  return null;
});

<Navigation
  items={{
    home: 'Home',
  }}
/>;
<Breadcrumb
  segments={{
    home: {
      value: 'Home',
      href: '/',
    },
  }}
/>;
<Tabs
  tabs={{
    profile: {
      value: 'Profile',
      isActive: true,
    },
  }}
/>;
// @ts-expect-error Breadcrumb items are supplied as segments.
<Breadcrumb items={{}} />;
// @ts-expect-error Tabs are required.
<Tabs />;
<Tabs
  tabs={{
    // @ts-expect-error An item object requires its label.
    profile: {
      href: '/profile',
    },
  }}
/>;

expectTypeOf<NavigationItem>().toEqualTypeOf<
  | string
  | {
      value: string;
      href?: string | undefined;
      isActive?: boolean | undefined;
      isDisabled?: boolean | undefined;
    }
>();
