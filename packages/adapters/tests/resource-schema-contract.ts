import { describe, expect, it } from 'vitest';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { SchemaResource, ResourceSchemaOptions } from '../src';

export function describeResourceSchemaContract(
  createSchema: (
    resources:
      | { raw(): readonly SchemaResource[] }
      | readonly SchemaResource[]
      | (() => readonly SchemaResource[]),
    options?: ResourceSchemaOptions,
  ) => StandardSchemaV1,
) {
  const definitions = [
    'posts',
    {
      value: 'users',
      subResources: [
        {
          value: 'details',
          subResources: ['edit'],
        },
      ],
    },
    "quote' | string",
    'posts',
  ] as const;
  const resources = {
    raw: () => definitions,
  };

  describe('resource schemas', () => {
    it('validates only declared top-level names', async () => {
      const schema = createSchema(resources);

      for (const value of ['posts', 'users', "quote' | string"]) {
        expect(await schema['~standard'].validate(value)).toMatchObject({
          value,
        });
      }

      for (const value of [
        'users.details',
        'missing',
        '',
        1,
        null,
        undefined,
        {},
        ['users'],
      ]) {
        expect(
          (await schema['~standard'].validate(value)).issues,
        ).toBeDefined();
      }
    });

    it('supports dotted paths at every depth', async () => {
      const schema = createSchema(resources, {
        nested: 'paths',
      });

      for (const value of [
        'users',
        'users.details',
        'users.details.edit',
        'posts',
      ]) {
        expect(await schema['~standard'].validate(value)).toMatchObject({
          value,
        });
      }

      for (const value of [
        'details',
        'users.edit',
        'posts.details',
        'users.details.missing',
      ]) {
        expect(
          (await schema['~standard'].validate(value)).issues,
        ).toBeDefined();
      }
    });

    it('combines each schema shape with every nesting mode', async () => {
      for (const format of ['union', 'array'] as const) {
        for (const nested of ['exclude', 'names', 'paths'] as const) {
          const schema = createSchema(resources, {
            format,
            nested,
          });
          const value =
            nested === 'names'
              ? 'edit'
              : nested === 'paths'
                ? 'users.details.edit'
                : 'users';
          const valid = format === 'array' ? [value, 'posts'] : value;
          const invalid = format === 'array' ? [value, 'missing'] : 'missing';

          expect(await schema['~standard'].validate(valid)).toMatchObject({
            value: valid,
          });
          expect(
            (await schema['~standard'].validate(invalid)).issues,
          ).toBeDefined();
          expect(
            (
              await schema['~standard'].validate(
                format === 'array' ? value : [value],
              )
            ).issues,
          ).toBeDefined();
        }
      }
    });

    it('accepts definitions and selection thunks', async () => {
      for (const input of [definitions, () => definitions]) {
        expect(
          await createSchema(input)['~standard'].validate('users'),
        ).toMatchObject({
          value: 'users',
        });
      }
    });

    it('rejects every value for an empty selection', async () => {
      const schema = createSchema({
        raw: () => [],
      });

      for (const value of ['', 'users', undefined, null, 0]) {
        expect(
          (await schema['~standard'].validate(value)).issues,
        ).toBeDefined();
      }
    });
  });
}
