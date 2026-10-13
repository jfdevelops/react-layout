import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { defineResourceLayout } from '../../src';
import { testResourceLayoutWithRender } from './helpers';

describe('createResourceLinks', () => {
  const { createResourceLinks, resources: layoutResources } =
    testResourceLayoutWithRender;

  it('allows an arbitrary property name', () => {
    expect(
      createResourceLinks({
        overview: {
          label: 'Overview',
          href(resource) {
            const overviewResource: 'overview' = resource;

            return `/directory/${overviewResource}`;
          },
        },
      }),
    ).toEqual([
      {
        href: {
          given: '/directory/overview',
          full: '/directory/overview#overview',
        },
        label: 'Overview',
        resource: 'overview',
        icon: null,
      },
    ]);
  });

  it('throws when config is missing', () => {

    expect(() =>
      createResourceLinks({ users: undefined } as never),
    ).toThrowError(
      '[createResourceLinks]: "config" is required for the users resource.',
    );
  });

  it('throws when config is not an object', () => {

    expect(() =>
      createResourceLinks({ users: 'not-an-object' } as never),
    ).toThrowError(
      '[createResourceLinks]: "config" must be an object for the users resource. Received string',
    );
  });

  it('throws when label is missing', () => {

    expect(() => createResourceLinks({ users: {} } as never)).toThrowError(
      '[createResourceLinks]: "label" is required for the users resource.',
    );
  });

  it('throws when label is not a string', () => {

    expect(() =>
      createResourceLinks({ users: { label: 123 } } as never),
    ).toThrowError(
      '[createResourceLinks]: "label" must be a string for the users resource. Received number',
    );
  });

  it('throws when href is not a string or function', () => {

    expect(() =>
      createResourceLinks({ users: { label: 'Users', href: 123 } } as never),
    ).toThrowError(
      '[createResourceLinks]: "href" must be a string or function for the users resource. Received number',
    );
  });

  it('throws when hash is not a string or function', () => {

    expect(() =>
      createResourceLinks({ users: { label: 'Users', hash: 123 } } as never),
    ).toThrowError(
      '[createResourceLinks]: "hash" must be a string or function for the users resource. Received number',
    );
  });

  it('uses / as href and the resource name as hash by default', () => {

    expect(createResourceLinks({ users: { label: 'Users' } })).toEqual([
      {
        href: {
          given: '/',
          full: '/#users',
        },
        label: 'Users',
        resource: 'users',
        icon: null,
      },
    ]);
  });

  it('uses a custom string href with the resource name as hash', () => {

    expect(
      createResourceLinks({
        users: {
          label: 'Users',
          href: '/directory',
        },
      }),
    ).toEqual([
      {
        href: {
          given: '/directory',
          full: '/directory#users',
        },
        label: 'Users',
        resource: 'users',
        icon: null,
      },
    ]);
  });

  it('resolves hrefs from a function', () => {

    expect(
      createResourceLinks({
        users: {
          label: 'Users',
          href: (resource) => `/directory/${resource}`,
        },
      }),
    ).toEqual([
      {
        href: {
          given: '/directory/users',
          full: '/directory/users#users',
        },
        label: 'Users',
        resource: 'users',
        icon: null,
      },
    ]);
  });

  it('uses a custom string hash and strips leading hashes', () => {

    expect(
      createResourceLinks({
        users: {
          label: 'Users',
          hash: '#directory-users',
        },
      }),
    ).toEqual([
      {
        href: {
          given: '/',
          full: '/#directory-users',
          hash: 'directory-users',
        },
        label: 'Users',
        resource: 'users',
        icon: null,
      },
    ]);
  });

  it('resolves hashes from a function', () => {

    expect(
      createResourceLinks({
        users: {
          label: 'Users',
          hash: (resource) => `${resource}-section`,
        },
      }),
    ).toEqual([
      {
        href: {
          given: '/',
          full: '/#users-section',
          hash: 'users-section',
        },
        label: 'Users',
        resource: 'users',
        icon: null,
      },
    ]);
  });

  it('uses the href hash when href and hash are both provided', () => {

    expect(
      createResourceLinks({
        users: {
          label: 'Users',
          href: '/directory#overview',
          hash: 'ignored',
        },
      }),
    ).toEqual([
      {
        href: {
          given: '/directory#overview',
          full: '/directory#overview',
        },
        label: 'Users',
        resource: 'users',
        icon: null,
      },
    ]);
  });

  it('maps each resource entry to a link', () => {

    expect(
      createResourceLinks({
        users: { label: 'Users' },
        posts: { label: 'Posts', href: '/content', hash: 'articles' },
      }),
    ).toEqual([
      {
        href: {
          given: '/',
          full: '/#users',
        },
        label: 'Users',
        resource: 'users',
        icon: null,
      },
      {
        href: {
          given: '/content',
          full: '/content#articles',
          hash: 'articles',
        },
        label: 'Posts',
        resource: 'posts',
        icon: null,
      },
    ]);
  });

  it('includes the resource name on each link', () => {

    const links = createResourceLinks({
      users: { label: 'Users' },
      posts: { label: 'Posts' },
    });

    expect(links.map((link) => link.resource)).toEqual(['users', 'posts']);
  });

  it('defaults icon to null when not provided', () => {

    const [link] = createResourceLinks({ users: { label: 'Users' } });

    expect(link.icon).toBeNull();
  });

  it('includes a custom icon when provided', () => {
    const icon = <span data-testid='users-icon'>U</span>;

    const [link] = createResourceLinks({
      users: { label: 'Users', icon },
    });

    expect(link.icon).toBe(icon);
  });

  it('includes activeIcon when provided', () => {
    const activeIcon = <span data-testid='active-users-icon'>AU</span>;
    const [usersLink, postsLink] = createResourceLinks({
      users: { label: 'Users', activeIcon },
      posts: { label: 'Posts' },
    });

    expect(usersLink.activeIcon).toBe(activeIcon);
    expect(postsLink.activeIcon).toBeUndefined();
  });

  describe('withGroups', () => {
    it('creates a resource map directly', () => {
      const map = createResourceLinks.createResourceMap({
        users: { to: '/users' },
        posts: { to: '/posts', search: { view: 'articles' } },
      });

      expect(map).toEqual({
        users: { to: '/users' },
        posts: { to: '/posts', search: { view: 'articles' } },
      });
    });

    it('narrows inferred resource keys and gets their values', () => {
      const map = createResourceLinks.createResourceMap({
        users: { to: '/users' },
        posts: { to: '/posts', search: { view: 'articles' } },
      });
      const candidate: unknown = 'users';

      expect(map.isValidResource(candidate)).toBe(true);
      expectTypeOf(map.get('users')).toEqualTypeOf<{
        readonly to: '/users';
      }>();
      expectTypeOf(map.get('posts')).toEqualTypeOf<{
        readonly to: '/posts';
        readonly search: { readonly view: 'articles' };
      }>();
      if (map.isValidResource(candidate)) {
        const resource: 'users' | 'posts' = candidate;

        expectTypeOf(map.get(resource)).toEqualTypeOf<
          | { readonly to: '/users' }
          | {
              readonly to: '/posts';
              readonly search: { readonly view: 'articles' };
            }
        >();
        expect(map.get(resource)).toEqual({ to: '/users' });
      }
      expect(map.isValidResource('comments')).toBe(false);
      expect(map.isValidResource('get')).toBe(false);
      expect(map.get('posts')).toEqual({
        to: '/posts',
        search: { view: 'articles' },
      });
      // @ts-expect-error Invalid inferred resources are rejected at the argument.
      const invalidResource = map.get('comments');
      expectTypeOf(invalidResource).toEqualTypeOf<never>();
    });

    it('rejects resource keys that conflict with map helpers', () => {
      const { createResourceLinks: createConflictingResourceLinks } =
        defineResourceLayout.forResources('get')({
          layout: { render: () => <></> },
        });

      expect(() =>
        createConflictingResourceLinks.createResourceMap({
          get: { to: '/get' },
        }),
      ).toThrowError(
        '[createResourceLinks.createResourceMap]: resource "get" conflicts with a map helper.',
      );
    });

    it('throws when a resource map contains an unknown resource', () => {
      expect(() =>
        createResourceLinks.createResourceMap({
          // @ts-expect-error Unknown resource keys must be rejected by the public type.
          unknown: { to: '/unknown' },
        }),
      ).toThrowError(
        '[createResourceLinks.createResourceMap]: unknown resource "unknown".',
      );
    });

    it('creates a resource map from the withGroups result', () => {
      const groups = createResourceLinks.withGroups([
        { links: { users: { label: 'Users' } } },
      ]);
      const map = groups.createResourceMap({
        users: { to: '/users' },
      });

      expect(map).toEqual({ users: { to: '/users' } });
    });

    it('rejects an empty group list', () => {
      expect(() =>
        createResourceLinks.withGroups(
          // @ts-expect-error Groups must include at least one entry.
          [],
        ),
      ).toThrowError(
        '[createResourceLinks.withGroups]: "groups" must include at least one group.',
      );
    });

    it('finds the group containing a resource', () => {
      const groups = createResourceLinks.withGroups([
        {
          label: 'Directory',
          links: { users: { label: 'Users' }, posts: { label: 'Posts' } },
        },
        {
          label: 'Settings',
          links: { roles: { label: 'Roles' } },
        },
      ]);

      expect(groups.findResource('posts')).toBe(groups[0]);
      expect(groups.findResource('roles')).toBe(groups[1]);

      expectTypeOf(groups.findResource('posts')).toEqualTypeOf<
        (typeof groups)[number]
      >();

      const groupsWithoutPosts = createResourceLinks.withGroups([
        { links: { users: { label: 'Users' } } },
      ]);

      expect(groupsWithoutPosts.findResource('posts')).toBeUndefined();
      expectTypeOf(
        groupsWithoutPosts.findResource('posts'),
      ).toEqualTypeOf<undefined>();

      // @ts-expect-error Unknown resources are rejected.
      groups.findResource('missing');
    });

    it('defaults group label to null when not provided', () => {

      const [group] = createResourceLinks.withGroups([
        { links: { users: { label: 'Users' } } },
      ]);

      expect(group.label).toBeNull();
    });

    it('throws when label is not a string', () => {

      expect(() =>
        createResourceLinks.withGroups([
          { label: 123, links: { users: { label: 'Users' } } } as never,
        ]),
      ).toThrowError(
        '[createResourceLinks.withGroups]: "label" must be a string for group at index 0. Received number',
      );
    });

    it('throws when links is missing from a group', () => {

      expect(() =>
        createResourceLinks.withGroups([{ label: 'Directory' } as never]),
      ).toThrowError(
        '[createResourceLinks.withGroups]: "links" is required for group at index 0.',
      );
    });

    it('throws when links is not an object', () => {

      expect(() =>
        createResourceLinks.withGroups([
          { label: 'Directory', links: 'not-an-object' } as never,
        ]),
      ).toThrowError(
        '[createResourceLinks.withGroups]: "links" must be an object for group at index 0. Received string',
      );
    });

    it('allows an arbitrary link property name', () => {

      const [group] = createResourceLinks.withGroups([
        {
          label: 'Directory',
          links: {
            overview: {
              label: 'Overview',
              hash(resource) {
                const overviewResource: 'overview' = resource;

                return `${overviewResource}-section`;
              },
            },
          },
        },
      ]);

      expect(group.links).toEqual([
        {
          href: {
            given: '/',
            full: '/#overview-section',
            hash: 'overview-section',
          },
          label: 'Overview',
          resource: 'overview',
          icon: null,
        },
      ]);
    });

    it('assigns each group a stable, position-based id', () => {
      const input = [
        { label: 'Directory', links: { users: { label: 'Users' } } },
        { links: { posts: { label: 'Posts' } } },
      ] as const;

      const groups = createResourceLinks.withGroups(input);

      expect(groups[0]?.id).toEqual(expect.any(String));
      expect(groups[1]?.id).toEqual(expect.any(String));
      expect(groups[0]?.id).not.toBe(groups[1]?.id);

      // Deterministic: the same input yields the same ids on every call, so
      // `withGroups()` is safe to call from module scope (no crypto/Math.random
      // — see `createResourceLinkGroupId`).
      const again = createResourceLinks.withGroups(input);
      expect(again[0]?.id).toBe(groups[0]?.id);
      expect(again[1]?.id).toBe(groups[1]?.id);
    });

    it('keeps ids distinct when groups from separate calls are concatenated', () => {
      // Two independent config modules, each defining their own first group —
      // both would be index 0 within their own `withGroups()` call.
      const moduleOwned = createResourceLinks.withGroups([
        { label: 'Directory', links: { users: { label: 'Users' } } },
      ]);
      const featureOwned = createResourceLinks.withGroups([
        { label: 'Billing', links: { invoices: { label: 'Invoices' } } },
      ]);

      const combined = [...moduleOwned, ...featureOwned];
      const ids = new Set(combined.map((group) => group.id));
      expect(ids.size).toBe(combined.length);
    });

    it('uses a caller-provided id when given, overriding the derived one', () => {
      const [group] = createResourceLinks.withGroups([
        { id: 'directory', label: 'Directory', links: { users: { label: 'Users' } } },
      ]);

      expect(group?.id).toBe('directory');
    });

    it('throws when id is not a string', () => {
      expect(() =>
        createResourceLinks.withGroups([
          { id: 123, links: { users: { label: 'Users' } } } as never,
        ]),
      ).toThrowError(
        '[createResourceLinks.withGroups]: "id" must be a string for group at index 0. Received number',
      );
    });

    it('maps each group to id, label, icon, and links', () => {
      const icon = <span data-testid='directory-icon'>D</span>;

      const groups = createResourceLinks.withGroups([
        {
          label: 'Directory',
          icon,
          links: {
            users: { label: 'Users' },
            posts: { label: 'Posts', href: '/content', hash: 'articles' },
          },
        },
        {
          label: 'Settings',
          links: {
            users: { label: 'User Settings', hash: 'user-settings' },
          },
        },
      ]);

      expect([...groups]).toEqual([
        {
          id: expect.any(String),
          label: 'Directory',
          icon,
          links: [
            {
              href: {
                given: '/',
                full: '/#users',
              },
              label: 'Users',
              resource: 'users',
              icon: null,
            },
            {
              href: {
                given: '/content',
                full: '/content#articles',
                hash: 'articles',
              },
              label: 'Posts',
              resource: 'posts',
              icon: null,
            },
          ],
        },
        {
          id: expect.any(String),
          label: 'Settings',
          icon: null,
          links: [
            {
              href: {
                given: '/',
                full: '/#user-settings',
                hash: 'user-settings',
              },
              label: 'User Settings',
              resource: 'users',
              icon: null,
            },
          ],
        },
      ]);
    });

    it('defaults group icon to null when not provided', () => {

      const [group] = createResourceLinks.withGroups([
        {
          label: 'Directory',
          links: { users: { label: 'Users' } },
        },
      ]);

      expect(group.icon).toBeNull();
    });

    it('is callable to resolve functional icons with a resource', () => {
      let receivedResource: unknown;
      const groups = createResourceLinks.withGroups([
        {
          label: 'Directory',
          icon: (resource) => {
            receivedResource = resource;
            resource();
            resource.pick('users');
            resource.omit('posts');

            return (
              <span
                data-testid='directory-icon'
                data-active={resource.current}
              />
            );
          },
          links: {
            users: {
              label: 'Users',
              icon: (resource) => (
                <span data-testid='users-icon' data-active={resource.current} />
              ),
            },
          },
        },
      ]);

      const [group] = groups('users');
      const resolvedLabels = groups('users')
        .filter(Boolean)
        .map((resolvedGroup) => resolvedGroup.label);

      expect(
        (receivedResource as { current: string }).current,
      ).toBe('users');
      expect(resolvedLabels).toEqual(['Directory']);
      render(
        <>
          {group.icon}
          {group.links[0]?.icon}
        </>,
      );
      expect(screen.getByTestId('directory-icon')).toHaveAttribute(
        'data-active',
        'users',
      );
      expect(screen.getByTestId('users-icon')).toHaveAttribute(
        'data-active',
        'users',
      );
    });

    it('keeps array methods available before resolving icons', () => {
      const groups = createResourceLinks.withGroups([
        {
          label: 'Directory',
          icon: (resource) => <span>{resource.current}</span>,
          links: { users: { label: 'Users' } },
        },
      ]);

      expect(groups.filter(Boolean).map((group) => group.label)).toEqual([
        'Directory',
      ]);
      expect(groups).toBeInstanceOf(Array);
      expect(JSON.stringify(groups)).toBe(JSON.stringify([...groups]));

      const replacement = { ...groups[0], label: 'Replacement' };
      groups[0] = replacement;

      expect(groups[0]).toBe(replacement);
    });

    it('throws when called without a resource', () => {
      const groups = createResourceLinks.withGroups([
        {
          icon: (resource) => <span>{resource.current}</span>,
          links: { users: { label: 'Users' } },
        },
      ]);

      expect(() => (groups as unknown as () => unknown)()).toThrowError(
        '[createResourceLinks.withGroups]: "resource" is required.',
      );
      expectTypeOf(groups).parameter(0).toEqualTypeOf<'users' | 'posts'>();
      expectTypeOf(groups).toBeCallableWith('users');
    });

    it('reads static icons from the groups value', () => {
      const icon = <span>Directory</span>;
      const linkIcon = <span>Users</span>;
      const groups = createResourceLinks.withGroups([
        {
          icon,
          links: { users: { label: 'Users', icon: linkIcon } },
        },
      ]);

      const [group] = groups;

      expect(group?.icon).toBe(icon);
      expect(group?.links[0]?.icon).toBe(linkIcon);
      expect(group?.links[0]?.resource).toBe('users');
    });

    it('defines reusable icon renderers with an overridable icon type', () => {
      type IconProps = { fill?: string };
      type Icon = (props: IconProps) => ReactNode;
      const defineActiveIcon = createResourceLinks.defineIcon<Icon>(
        ({ resource, Icon }) => (
          <Icon fill={resource.current === 'users' ? 'currentColor' : 'none'} />
        ),
      );
      function TestIcon({ fill }: IconProps) {
        return <span data-testid='defined-icon' data-fill={fill} />;
      }
      const groups = createResourceLinks.withGroups([
        {
          icon: defineActiveIcon(TestIcon),
          links: { users: { label: 'Users' } },
        },
      ]);

      const [group] = groups('users');
      render(group.icon);

      expect(screen.getByTestId('defined-icon')).toHaveAttribute(
        'data-fill',
        'currentColor',
      );
    });

    it('defines typed inputs for reusable icon renderers', () => {
      type IconProps = { fill?: string };
      type Icon = (props: IconProps) => ReactNode;
      const defineActiveIcon = createResourceLinks.defineIcon
        .input(({ resource, icon }) => ({
          resource: resource(),
          Icon: icon<Icon>(),
        }))
        .render(({ resource, input }) => {
          expectTypeOf(input.resource).toEqualTypeOf<'users' | 'posts'>();
          expectTypeOf(input.Icon).toEqualTypeOf<Icon>();
          expectTypeOf(resource.pick).toBeFunction();
          const Icon = input.Icon;

          return (
            <Icon
              fill={
                resource.current === input.resource ? 'currentColor' : 'none'
              }
            />
          );
        });
      function TestIcon({ fill }: IconProps) {
        return <span data-testid='defined-input-icon' data-fill={fill} />;
      }
      const groups = createResourceLinks.withGroups([
        {
          icon: defineActiveIcon({ resource: 'users', Icon: TestIcon }),
          links: { users: { label: 'Users' } },
        },
      ]);

      const [group] = groups('users');
      render(group.icon);

      expect(screen.getByTestId('defined-input-icon')).toHaveAttribute(
        'data-fill',
        'currentColor',
      );
    });

    it('includes group activeIcon when provided', () => {
      const activeIcon = <span data-testid='active-directory-icon'>AD</span>;
      const [directoryGroup, settingsGroup] =
        createResourceLinks.withGroups([
          {
            label: 'Directory',
            activeIcon,
            links: { users: { label: 'Users' } },
          },
          {
            label: 'Settings',
            links: { posts: { label: 'Posts' } },
          },
        ]);

      expect(directoryGroup.activeIcon).toBe(activeIcon);
      expect(settingsGroup.activeIcon).toBeUndefined();
    });
  });
});
