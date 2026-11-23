import type { CreateResourceSchema, ResourceSchemaTypes } from '../src';

declare const createSchema: CreateResourceSchema<ResourceSchemaTypes>;
declare const pick: ((
  ...keys: ['users' | 'posts', ...('users' | 'posts')[]]
) => () => readonly ('users' | 'posts')[]) & {
  readonly resourceSchema: {
    readonly kind: 'pick';
    readonly resources: readonly ['users', 'posts'];
  };
};

createSchema(pick, { args: ['users'] });
createSchema(pick, {
  args: ['users', 'posts'],
  format: 'array',
  nested: 'paths',
});

// @ts-expect-error required method arguments cannot be omitted
createSchema(pick);
// @ts-expect-error args is required for methods with required parameters
createSchema(pick, { format: 'array' });
// @ts-expect-error pick needs at least one key
createSchema(pick, { args: [] });
// @ts-expect-error keys must come from the resource method
createSchema(pick, { args: ['missing'] });
// @ts-expect-error non-function sources do not accept method arguments
createSchema(['users'], { args: ['users'] });
// @ts-expect-error unsupported schema shapes are rejected
createSchema(['users'], { format: 'tuple' });
// @ts-expect-error unsupported nested-resource modes are rejected
createSchema(['users'], { nested: 'all' });
