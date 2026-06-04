import type { GetComponent } from '../../src/create-config';

type TestResources = readonly [
  {
    readonly value: 'users';
    readonly subResources: readonly [
      { readonly value: 'managers'; readonly subResources: readonly ['female'] },
    ];
  },
  'groups',
];

declare const getComponent: GetComponent<TestResources>;

// @ts-expect-error — groups has no subResources in the layout tree
getComponent.forResource({
  resource: 'groups',
  subResource: { resource: 'managers', subResource: 'female' },
});
