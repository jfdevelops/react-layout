import type {
  CreateResourceSchema,
  ResourceSchemaTypes,
  ResourceSchemaFormat,
  ResourceSchemaNested,
} from '../src';

export const resourceDefinitions = [
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
] as const;

function raw<Selected = typeof resourceDefinitions>(
  select?: (resources: typeof resourceDefinitions) => Selected,
) {
  return select
    ? select(resourceDefinitions)
    : (resourceDefinitions as Selected);
}

function pick(...keys: [string, ...string[]]) {
  return () =>
    resourceDefinitions.filter((resource) =>
      keys.includes(typeof resource === 'string' ? resource : resource.value),
    );
}

function omit(...keys: [string, ...string[]]) {
  return () =>
    resourceDefinitions.filter(
      (resource) =>
        !keys.includes(
          typeof resource === 'string' ? resource : resource.value,
        ),
    );
}

export const resourceMethods = {
  raw,
  pick: Object.assign(pick, {
    resourceSchema: {
      kind: 'pick' as const,
      resources: resourceDefinitions,
    },
  }),
  omit: Object.assign(omit, {
    resourceSchema: {
      kind: 'omit' as const,
      resources: resourceDefinitions,
    },
  }),
};

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
  const definitions = [
    'posts',
    {
      value: 'users',
      subResources: ['details'],
    },
  ] as const;

  function raw<Selected = typeof definitions>(
    select?: (resources: typeof definitions) => Selected,
  ) {
    return select ? select(definitions) : (definitions as Selected);
  }

  const selected = Object.assign(
    (..._keys: ['posts' | 'users', ...('posts' | 'users')[]]) =>
      () =>
        definitions,
    {
      resourceSchema: {
        kind: 'pick' as const,
        resources: definitions,
      },
    },
  );
  const omitted = Object.assign(
    (..._keys: ['posts' | 'users', ...('posts' | 'users')[]]) =>
      () =>
        definitions,
    {
      resourceSchema: {
        kind: 'omit' as const,
        resources: definitions,
      },
    },
  );

  function dynamic(format: ResourceSchemaFormat, nested: ResourceSchemaNested) {
    return createSchema(
      {
        raw,
      },
      {
        format,
        nested,
      },
    );
  }

  return {
    union: createSchema({
      raw,
    }),
    paths: createSchema(
      {
        raw,
      },
      {
        nested: 'paths',
      },
    ),
    names: createSchema(
      {
        raw,
      },
      {
        nested: 'names',
      },
    ),
    array: createSchema(
      {
        raw,
      },
      {
        format: 'array',
      },
    ),
    arrayPaths: createSchema(
      {
        raw,
      },
      {
        format: 'array',
        nested: 'paths',
      },
    ),
    arrayNames: createSchema(
      {
        raw,
      },
      {
        format: 'array',
        nested: 'names',
      },
    ),
    raw: createSchema(raw),
    rawSelected: createSchema(raw, {
      args: [(definitions) => [definitions[0]] as const],
    }),
    picked: createSchema(selected, {
      args: ['users'],
      nested: 'paths',
    }),
    omitted: createSchema(omitted, {
      args: ['posts'],
    }),
    thunk: createSchema(() => ['users'] as const),
    empty: createSchema([] as const),
    emptyArray: createSchema([] as const, {
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
