import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { defineResourceLayout, InvalidPathError } from '../../src';
import { pages } from './fixtures/renderer';

describe('renderer display names', () => {
  it('capitalizes an explicit path and widens wildcard results to valid strings', () => {
    const renderPage = pages.createRenderer({
      render: () => null,
      displayName: ({ path }) => {
        const explicit = path.capitalize('containers.$containerId');
        const all = path.capitalize('*');
        expectTypeOf(explicit).toEqualTypeOf<'Containers.$containerId'>();
        expectTypeOf(all).toEqualTypeOf<
          | 'Containers'
          | 'Containers.$containerId'
          | 'Containers.$subResource'
          | 'Trash'
          | '$resource'
          | '$resource.$containerId'
          | '$resource.$subResource'
        >();
        expect(all).toBe('Trash');
        if (path.is('trash')) {
          const wildcard = path.capitalize('*');
          expectTypeOf(wildcard).toEqualTypeOf<typeof all>();
        }

        const invalid: string = 'missing';
        // @ts-expect-error Unknown paths are rejected by the caller contract too.
        expect(() => path.capitalize(invalid)).toThrow(InvalidPathError);

        return explicit;
      },
    });
    const Component = renderPage('trash');
    renderToStaticMarkup(<Component />);
    expect(Component.displayName).toBe('Containers.$containerId');
  });

  it('limits wildcard capitalization to the selected path configuration', () => {
    const renderPage = pages.createRenderer({
      params: {
        include: {
          path: {
            pick: {
              resource: {
                trash: true,
              },
            },
          },
        },
      },
      render: () => null,
      displayName: ({ path }) => {
        const all = path.capitalize('*');
        expectTypeOf(all).toEqualTypeOf<'Trash' | '$resource'>();
        expect(all).toBe('Trash');

        return all;
      },
    });
    const Component = renderPage('trash');
    renderToStaticMarkup(<Component />);
    expect(Component.displayName).toBe('Trash');
  });

  it('narrows display-name paths and reuses capitalization helpers', () => {
    const renderPage = pages.createRenderer({
      render: () => null,
      displayName: ({ path, capitalize }) => {
        if (path.is('containers')) {
          expectTypeOf(path.value).toEqualTypeOf<
            'containers' | 'containers.$containerId' | 'containers.$subResource'
          >();

          if (path.is('containers.$containerId')) {
            expectTypeOf(path.value).toEqualTypeOf<'containers.$containerId'>();
            expectTypeOf(
              path.capitalize(),
            ).toEqualTypeOf<'Containers.$containerId'>();

            return path.capitalize();
          }

          return capitalize(path.value);
        }

        return `${path}`;
      },
    });
    const names = (
      ['containers', 'containers.$containerId', 'trash'] as const
    ).map((path) => {
      const Component = renderPage(path);
      renderToStaticMarkup(<Component />);

      return Component.displayName;
    });
    expect(names).toEqual(['Containers', 'Containers.$containerId', 'trash']);
  });

  it('resolves the most specific mapping and exposes typed segments', () => {
    const config = defineResourceLayout({
      resources: [
        {
          value: 'containers',
          subResources: [
            {
              value: 'overview',
              subResources: ['history'],
            },
            'create',
          ],
        },
        'trash',
      ],
      layout: {
        render: () => <main />,
      },
    }).createResourceConfig({
      containers: {
        component: <p>Containers</p>,
        overview: {
          component: <p>Overview</p>,
          history: {
            component: <p>History</p>,
          },
        },
        create: {
          component: <p>New</p>,
        },
      },
      trash: {
        component: <p>Trash</p>,
      },
    });
    const renderPage = config.createRenderer({
      render: () => null,
      displayName: {
        containers: ({ path }) => {
          if (path.is('containers.create')) {
            expectTypeOf(path.segments.create.value).toEqualTypeOf<'create'>();
          }

          return path.create(path.segments.containers.capitalize(), 'Page');
        },
        'containers.overview': ({ path, params, capitalize }) => {
          const name = path.capitalize({
            join: ({ segments, create }) =>
              create(
                segments.containers.capitalize(),
                segments.overview.capitalize(),
                'Page',
              ),
          });
          expectTypeOf(name).toEqualTypeOf<'ContainersOverviewPage'>();
          expectTypeOf(
            path.segments.overview.value,
          ).toEqualTypeOf<'overview'>();
          expect(path.segments.overview.is('overview')).toBe(true);
          expect(path.segments.overview.capitalize('*')).toBe('Overview');
          expect(capitalize('page')).toBe('Page');
          expect(params).toBeDefined();
          // @ts-expect-error Only segments of the selected path are available.
          void path.segments.missing;

          return name;
        },
        'containers.create': 'CreateContainersPage',
        '*': ({ path }) => path.create(path.capitalize(), 'Fallback'),
      },
    });
    const names = (
      [
        'containers',
        'containers.overview',
        'containers.overview.history',
        'containers.create',
        'trash',
      ] as const
    ).map((path) => {
      const Component = renderPage(path);
      renderToStaticMarkup(<Component />);

      return Component.displayName;
    });
    expect(names).toEqual([
      'ContainersPage',
      'ContainersOverviewPage',
      'ContainersOverviewPage',
      'CreateContainersPage',
      'TrashFallback',
    ]);

    const defaultRenderer = config.createRenderer({
      render: () => null,
    });
    const partialRenderer = config.createRenderer({
      render: () => null,
      displayName: {
        containers: 'Container',
      },
    });
    const Default = defaultRenderer('trash');
    const Partial = partialRenderer('trash');
    expect(Partial.displayName).toBe(Default.displayName);

    config.createRenderer({
      render: () => null,
      displayName: {
        // @ts-expect-error Unknown mapping paths are rejected.
        missing: 'Missing',
      },
    });
  });

  it('supports custom joining inside an existing display-name callback', () => {
    const joinedNames: string[] = [];
    const renderPage = pages.createRenderer({
      render: () => null,
      displayName: ({ path }) => {
        if (path.is('containers.$containerId')) {
          joinedNames.push(
            path.capitalize({
              join: {},
            }),
            path.capitalize({
              join: {
                removeDelimiter: true,
                capitalizeSegments: true,
              },
            }),
          );

          return path.capitalize({
            join: ({ segments, create, capitalize }) =>
              create(
                capitalize(segments.$containerId.value),
                segments.containers.capitalize(),
                'Page',
              ),
          });
        }

        return path.capitalize();
      },
    });
    const Component = renderPage('containers.$containerId');
    renderToStaticMarkup(<Component />);
    expect(joinedNames).toEqual([
      'Containers.$containerId',
      'Containers$containerId',
    ]);
    expect(Component.displayName).toBe('$containerIdContainersPage');
  });

  it('matches nested parent paths on dot boundaries', () => {
    const config = defineResourceLayout({
      resources: [
        {
          value: 'author',
          subResources: [
            {
              value: 'address',
              subResources: ['city'],
            },
          ],
        },
        'authorId',
      ],
      layout: {
        render: () => <main />,
      },
    }).createResourceConfig({
      author: {
        component: <p>Author</p>,
        address: {
          component: <p>Address</p>,
          city: {
            component: <p>City</p>,
          },
        },
      },
      authorId: {
        component: <p>ID</p>,
      },
    });
    const renderPage = config.createRenderer({
      render: () => null,
      displayName: ({ path }) => {
        if (path.value === 'authorId') {
          // @ts-expect-error Unknown paths cannot be tested.
          path.is('missing');
        }

        if (path.is('author.address')) {
          expectTypeOf(path.value).toEqualTypeOf<
            'author.address' | 'author.address.city'
          >();

          return 'Address';
        }

        return path.is('author') ? 'Author' : 'ID';
      },
    });
    const names = [
      renderPage('author.address.city'),
      renderPage.forPath('author').build(),
      renderPage('authorId'),
    ].map((Component) => {
      renderToStaticMarkup(<Component />);

      return Component.displayName;
    });
    expect(names).toEqual(['Address', 'Author', 'ID']);
  });
});
