import { defineResources } from '../../core/src/resource';
import { createLayoutResourcesAccessor } from '../../core/src/create-config/resource-accessor';
import type {
  CreateResourceSchema,
  ResourceSchemaTypes,
  ResourceSchemaFormat,
  ResourceSchemaNested,
} from '../src';

export const resourceDefinitions = defineResources(
  'posts',
  {
    value: 'users',
    subResources: [
      {
        value: 'details',
        allowAnyString: true,
        subResources: ['edit'],
      },
      'shared',
    ],
  },
  {
    value: 'teams',
    subResources: ['shared'],
  },
  "quote' | string",
  'posts',
  {
    value: 'empty',
    subResources: [],
  },
);

export const resourceMethods =
  createLayoutResourcesAccessor(resourceDefinitions);

export const allowedResources = {
  exclude: ['posts', 'users', 'teams', "quote' | string", 'empty'],
  names: [
    'posts',
    'users',
    'teams',
    "quote' | string",
    'empty',
    'details',
    'edit',
    'shared',
  ],
  paths: [
    'posts',
    'users',
    'teams',
    "quote' | string",
    'empty',
    'users.details',
    'users.details.edit',
    'users.shared',
    'teams.shared',
  ],
};

export function createResourceSchemaTypeCases<
  Types extends ResourceSchemaTypes,
>(createSchema: CreateResourceSchema<Types>) {
  const definitions = defineResources('posts', {
    value: 'users',
    subResources: ['details'],
  });

  const resources = createLayoutResourcesAccessor(definitions);
  const { raw, pick: selected, omit: omitted } = resources;

  function dynamic(format: ResourceSchemaFormat, nested: ResourceSchemaNested) {
    return createSchema(resources, {
      format,
      nested,
    });
  }

  return {
    union: createSchema(resources),
    paths: createSchema(resources, {
      nested: 'paths',
    }),
    names: createSchema(resources, {
      nested: 'names',
    }),
    array: createSchema(resources, {
      format: 'array',
    }),
    arrayPaths: createSchema(resources, {
      format: 'array',
      nested: 'paths',
    }),
    arrayNames: createSchema(resources, {
      format: 'array',
      nested: 'names',
    }),
    raw: createSchema(raw),
    rawSelected: createSchema(raw, {
      args: [(definitions) => defineResources(definitions[0])],
    }),
    picked: createSchema(selected, {
      args: ['users'],
      nested: 'paths',
    }),
    omitted: createSchema(omitted, {
      args: ['posts'],
    }),
    thunk: createSchema(selected('users')),
    empty: createSchema(defineResources()),
    emptyArray: createSchema(defineResources(), {
      format: 'array',
    }),
    dynamic: dynamic('union', 'exclude'),
  };
}

type NativeArray<
  Value,
  ReadonlyArrays extends boolean,
> = ReadonlyArrays extends true ? readonly Value[] : Value[];

export type ResourceSchemaExpectedOutputs<
  ReadonlyArrays extends boolean = false,
> = {
  union: 'posts' | 'users';
  paths: 'posts' | 'users' | 'users.details';
  names: 'posts' | 'users' | 'details';
  array: NativeArray<'posts' | 'users', ReadonlyArrays>;
  arrayPaths: NativeArray<'posts' | 'users' | 'users.details', ReadonlyArrays>;
  arrayNames: NativeArray<'posts' | 'users' | 'details', ReadonlyArrays>;
  raw: 'posts' | 'users';
  rawSelected: 'posts';
  picked: 'users' | 'users.details';
  omitted: 'users';
  thunk: 'users';
  empty: never;
  emptyArray: NativeArray<never, ReadonlyArrays>;
  dynamic:
    | 'posts'
    | 'users'
    | 'details'
    | 'users.details'
    | NativeArray<
        'posts' | 'users' | 'details' | 'users.details',
        ReadonlyArrays
      >;
};
