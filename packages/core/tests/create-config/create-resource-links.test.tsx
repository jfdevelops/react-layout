import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { testResourceLayoutWithRender } from './helpers';

describe('createResourceLinks', () => {
  const { createResourceLinks } = testResourceLayoutWithRender;

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

  describe('withGroups', () => {
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

    it('assigns a generated id to each group', () => {

      const groups = createResourceLinks.withGroups([
        { label: 'Directory', links: { users: { label: 'Users' } } },
        { links: { posts: { label: 'Posts' } } },
      ]);

      expect(groups[0]?.id).toEqual(expect.any(String));
      expect(groups[1]?.id).toEqual(expect.any(String));
      expect(groups[0]?.id).not.toBe(groups[1]?.id);
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

      expect(groups).toEqual([
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
  });
});
