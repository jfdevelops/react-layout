import { describe, expect, it, vi } from 'vitest';
import {
  collectDescendantNodes,
  collectSubResourceKeysBelow,
  pathExistsOnNode,
  collectPathResources,
  collectPathComponentKeys,
  collectPathSubResourceKeys,
  collectPathValidationSets,
} from '../../src/create-config/paths/introspect';
import { generateResourceConfigPaths } from '../../src/create-config/paths/generate';

describe('path introspection traversal', () => {
  it('preserves the separate depth boundaries for slugs and component slots', () => {
    let node: Record<string, unknown> = {
      errorComponent: 'beyond depth limit',
    };

    for (let depth = 8; depth > 0; depth--) {
      node = {
        component: 'slot',
        [`level${depth}`]: node,
      };
    }

    const config = {
      users: node,
    };
    const path = '$resource.$subResource.$component';
    const targets = {
      resources: new Set<string>(),
      subResources: new Set<string>(),
      components: new Set<string>(),
    };

    collectPathValidationSets(config, path, targets);

    expect([...targets.resources]).toEqual(collectPathResources(config, path));
    expect([...targets.subResources]).toEqual(
      collectPathSubResourceKeys(config, path),
    );
    expect([...targets.components]).toEqual(
      collectPathComponentKeys(config, path),
    );
  });

  it('collects validation categories together with the same contents and order as separate collectors', () => {
    const config = {
      users: {
        component: 'users',
        errorComponent: 'error',
        detail: {
          component: 'detail',
        },
        admins: {
          component: 'admins',
          nested: {
            pendingComponent: 'pending',
            detail: {
              component: 'nested',
            },
          },
        },
        guests: {
          notFoundComponent: 'missing',
        },
      },
      groups: {
        component: 'groups',
        admins: {
          pendingComponent: 'pending',
        },
      },
      empty: {},
    };
    const paths = [
      ...generateResourceConfigPaths(config),
      '$resource.missing',
      '$resource.$subResource.$subResource.$component',
    ];

    for (const path of paths) {
      for (let mask = 1; mask < 8; mask++) {
        const targets = {
          resources: mask & 1 ? new Set<string>() : undefined,
          subResources:
            mask & 2 && path.includes('$subResource')
              ? new Set<string>()
              : undefined,
          components: mask & 4 ? new Set<string>() : undefined,
        };

        collectPathValidationSets(config, path, targets);

        expect({
          resources: targets.resources ? [...targets.resources] : undefined,
          subResources: targets.subResources
            ? [...targets.subResources]
            : undefined,
          components: targets.components ? [...targets.components] : undefined,
        }).toEqual({
          resources: targets.resources
            ? collectPathResources(config, path)
            : undefined,
          subResources: targets.subResources
            ? collectPathSubResourceKeys(config, path)
            : undefined,
          components: targets.components
            ? collectPathComponentKeys(config, path)
            : undefined,
        });
      }
    }
  });

  it('looks up literal resources without inspecting other resources', () => {
    const readOther = vi.fn<() => Record<string, unknown>>(() => ({}));
    const config = Object.defineProperty(
      {
        users: {},
      },
      'other',
      {
        enumerable: true,
        get: readOther,
      },
    );

    expect(collectPathResources(config, 'users')).toEqual(['users']);
    expect(collectPathResources(config, 'missing')).toEqual([]);
    expect(collectPathResources(config, 'toString')).toEqual([]);
    expect(readOther).not.toHaveBeenCalled();
  });

  it('excludes inherited and non-enumerable literal resource names', () => {
    const config = Object.create({
      inherited: {},
    });
    Object.defineProperty(config, 'hidden', {
      value: {},
    });

    expect(collectPathResources(config, 'inherited')).toEqual([]);
    expect(collectPathResources(config, 'hidden')).toEqual([]);
  });

  it('matches fixed segments following nested subresource and component variables', () => {
    const node = {
      teams: {
        admins: {
          detail: {
            component: {
              leaf: {},
            },
          },
        },
      },
    };

    expect(
      pathExistsOnNode(node, ['$subResource', 'detail', '$component', 'leaf']),
    ).toBe(true);
    expect(
      pathExistsOnNode(node, [
        '$subResource',
        'detail',
        '$component',
        'missing',
      ]),
    ).toBe(false);
  });

  it('preserves traversal order, duplicate removal, and depth boundaries', () => {
    const nested = {
      leaf: {},
    };
    const first = {
      nested,
    };
    const second = {
      nested: {},
    };
    const node = {
      first,
      second,
    };

    expect(collectDescendantNodes(node, 0)).toEqual([]);
    expect(collectDescendantNodes(node, 1)).toEqual([first, second]);
    expect(collectDescendantNodes(node, 2)).toEqual([
      first,
      nested,
      second,
      second.nested,
    ]);
    expect(collectSubResourceKeysBelow(node, 0)).toEqual(['first', 'second']);
    expect(collectSubResourceKeysBelow(node, 1)).toEqual([
      'first',
      'second',
      'nested',
    ]);
    expect(collectSubResourceKeysBelow(node, 2)).toEqual([
      'first',
      'second',
      'nested',
      'leaf',
    ]);
  });

  it('stops searching descendants once a wildcard path matches', () => {
    const readDescendant = vi.fn<() => Record<string, unknown>>(() => ({}));
    const later = Object.defineProperty({}, 'deep', {
      enumerable: true,
      get: readDescendant,
    });

    expect(
      pathExistsOnNode(
        {
          first: {
            component: 'slot',
          },
          later,
        },
        ['$subResource', 'component'],
      ),
    ).toBe(true);
    expect(readDescendant).not.toHaveBeenCalled();
  });
});
