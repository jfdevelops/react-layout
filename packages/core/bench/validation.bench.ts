import { bench, describe } from 'vitest';
import {
  collectPathResources,
  collectPathSubResourceKeys,
  collectPathComponentKeys,
  collectPathValidationSets,
} from '../src/create-config/paths/introspect';

function tree(depth: number): Record<string, unknown> {
  if (depth === 0) {
    return {
      component: 'slot',
    };
  }

  return {
    component: 'slot',
    ...Object.fromEntries(
      Array.from(
        {
          length: 4,
        },
        (_, i) => ['child' + i, tree(depth - 1)],
      ),
    ),
  };
}

const config = {
  users: tree(5),
  groups: tree(5),
};
const path = '$resource.$subResource.$component';

describe('validation collection', () => {
  bench(
    'separate',
    () => {
      const resources = collectPathResources(config, path);
      new Set(resources);
      new Set(collectPathSubResourceKeys(config, path, resources));
      new Set(collectPathComponentKeys(config, path, resources));
    },
    {
      time: 300,
    },
  );
  bench(
    'combined',
    () => {
      collectPathValidationSets(config, path, {
        resources: new Set(),
        subResources: new Set(),
        components: new Set(),
      });
    },
    {
      time: 300,
    },
  );
});
