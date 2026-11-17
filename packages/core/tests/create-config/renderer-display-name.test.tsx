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
