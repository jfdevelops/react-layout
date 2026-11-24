import { defineResources } from '../../core/src/resource';
import { describe, expect, it, vi } from 'vitest';
import type { CreateResourceSchema, ResourceSchemaTypes } from '../src';
import {
  allowedResources,
  resourceDefinitions,
  resourceMethods,
} from './resource-schema-fixtures';

export function describeResourceSchemaContract<
  Types extends ResourceSchemaTypes,
>(createSchema: CreateResourceSchema<Types>) {
  describe('resource schemas', () => {
    for (const format of ['union', 'array'] as const) {
      for (const nested of ['exclude', 'names', 'paths'] as const) {
        it(`validates the full ${format}/${nested} literal set and rejects excluded values`, async () => {
          const schema = createSchema(resourceDefinitions, {
            format,
            nested,
          });
          const allowed: readonly string[] = allowedResources[nested];
          const candidates = new Set([
            ...allowedResources.names,
            ...allowedResources.paths,
            '',
            'unknown',
            'users.edit',
            'users.details.anything',
          ]);

          for (const value of candidates) {
            const input = format === 'array' ? [value] : value;
            const result = await schema['~standard'].validate(input);

            expect(result.issues === undefined).toBe(allowed.includes(value));
          }

          for (const value of [
            undefined,
            null,
            {},
            1,
            true,
            format === 'array' ? 'users' : ['users'],
          ]) {
            expect(
              (await schema['~standard'].validate(value)).issues,
            ).toBeDefined();
          }

          expect(
            (await schema['~standard'].validate([])).issues === undefined,
          ).toBe(format === 'array');
          expect(
            (await schema['~standard'].validate(allowed)).issues === undefined,
          ).toBe(format === 'array');
          expect(
            (await schema['~standard'].validate(['users', 'unknown'])).issues,
          ).toBeDefined();
          expect(
            (await schema['~standard'].validate(['users', null])).issues,
          ).toBeDefined();
        });

        it(`resolves all input forms with ${format}/${nested}`, async () => {
          const schemas = [
            createSchema(resourceDefinitions, {
              format,
              nested,
            }),
            createSchema(resourceMethods, {
              format,
              nested,
            }),
            createSchema(resourceMethods.raw, {
              format,
              nested,
            }),
            createSchema(resourceMethods.raw, {
              format,
              nested,
              args: [
                (definitions) =>
                  definitions.filter(
                    (resource) =>
                      typeof resource !== 'string' &&
                      resource.value === 'users',
                  ),
              ],
            }),
            createSchema(resourceMethods.pick, {
              format,
              nested,
              args: ['users'],
            }),
            createSchema(resourceMethods.omit, {
              format,
              nested,
              args: ['posts', 'teams', "quote' | string", 'empty'],
            }),
            createSchema(resourceMethods.pick('users'), {
              format,
              nested,
            }),
            createSchema(
              resourceMethods.omit(
                'posts',
                'teams',
                "quote' | string",
                'empty',
              ),
              {
                format,
                nested,
              },
            ),
          ];
          const value =
            nested === 'paths'
              ? 'users.details.edit'
              : nested === 'names'
                ? 'edit'
                : 'users';
          const input = format === 'array' ? [value] : value;

          for (const schema of schemas) {
            expect(await schema['~standard'].validate(input)).toMatchObject({
              value: input,
            });
          }

          for (const schema of schemas.slice(3)) {
            expect(
              (
                await schema['~standard'].validate(
                  format === 'array' ? ['posts'] : 'posts',
                )
              ).issues,
            ).toBeDefined();
          }
        });
      }
    }

    it('defaults to a top-level literal union', async () => {
      const schema = createSchema(resourceMethods);

      expect(await schema['~standard'].validate('users')).toMatchObject({
        value: 'users',
      });
      expect(
        (await schema['~standard'].validate('users.details')).issues,
      ).toBeDefined();
      expect(
        (await schema['~standard'].validate(['users'])).issues,
      ).toBeDefined();
    });

    it('supports multiple pick arguments without including other resources', async () => {
      const schema = createSchema(resourceMethods.pick, {
        args: ['posts', 'users'],
        nested: 'paths',
      });

      for (const value of ['posts', 'users', 'users.details.edit']) {
        expect(await schema['~standard'].validate(value)).toMatchObject({
          value,
        });
      }

      expect(
        (await schema['~standard'].validate('teams.shared')).issues,
      ).toBeDefined();
    });

    it('handles empty definitions and omitting every resource', async () => {
      for (const format of ['union', 'array'] as const) {
        const schemas = [
          createSchema([], {
            format,
          }),
          createSchema(resourceMethods.omit, {
            format,
            args: ['posts', 'users', 'teams', "quote' | string", 'empty'],
          }),
        ];

        for (const schema of schemas) {
          for (const value of ['', 'users', ['users'], undefined, null]) {
            expect(
              (await schema['~standard'].validate(value)).issues,
            ).toBeDefined();
          }

          const empty = await schema['~standard'].validate([]);

          expect(empty.issues === undefined).toBe(format === 'array');
        }
      }
    });

    it('forwards arguments once and resolves a returned selection once', async () => {
      const selection = vi.fn<() => readonly ['users']>(() =>
        defineResources('users'),
      );
      const method = vi.fn<(first: string, second: number) => typeof selection>(
        (_first, _second) => selection,
      );
      const schema = createSchema(method, {
        args: ['users', 2],
      });

      expect(method).toHaveBeenCalledExactlyOnceWith('users', 2);
      expect(selection).toHaveBeenCalledExactlyOnceWith();
      expect(await schema['~standard'].validate('users')).toMatchObject({
        value: 'users',
      });
      expect(method).toHaveBeenCalledTimes(1);
    });

    it('uses raw definitions when a callable accessor also has raw', async () => {
      const accessor = Object.assign(
        vi.fn<() => string[]>(() => ['wrong']),
        {
          raw: vi.fn<() => string[]>(() => ['users']),
        },
      );
      const schema = createSchema(accessor);

      expect(accessor).not.toHaveBeenCalled();
      expect(accessor.raw).toHaveBeenCalledExactlyOnceWith();
      expect(await schema['~standard'].validate('users')).toMatchObject({
        value: 'users',
      });
    });

    it('rejects invalid function results and propagates source errors', () => {
      for (const value of [null, 'users', {}, Promise.resolve([])]) {
        expect(() => createSchema(() => value)).toThrow(
          'Resource schema input must produce resource definitions.',
        );
      }

      const error = new Error('source failed');

      expect(() =>
        createSchema(() => {
          throw error;
        }),
      ).toThrow(error);
    });
  });
}
