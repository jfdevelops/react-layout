// @vitest-environment node
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  createDefinedResourceLayout,
  defineLayoutName,
  InvalidPartError,
  InvalidPartTypeError,
  ReactLayoutError
} from '../../src';

describe.each(['object', 'callback'])(
  'naming parts from an %s',
  (source) => {
    function setup() {
      const pattern = vi.fn();
      const naming = defineLayoutName
        .defineParts({ section: 'string', version: 'number' })
        .namingFn(({ resource, capitalize }, parts) => {
          pattern();
          return `${parts.section}${capitalize(resource)}V${
            parts.version
          }`;
        });
      function createLayout(values: unknown) {
        const resolver = Reflect.apply(naming, undefined, [
          source === 'callback' ? () => values : values
        ]);
        return createDefinedResourceLayout({
          resources: ['users'],
          name: resolver
        })
          .defineResourceLayout({ render: () => createElement('div') })
          .createResourceLayout({ resource: 'users' });
      }
      return { naming, pattern, createLayout };
    }

    it.each([
      { version: '2' },
      { version: '' },
      { version: null },
      { version: false },
      { version: {} },
      { version: [] },
      { section: 2 }
    ])('rejects values with the wrong kind: %j', (values) => {
      const { createLayout, pattern } = setup();
      expect(() => createLayout(values)).toThrowError(
        InvalidPartTypeError
      );
      expect(pattern).not.toHaveBeenCalled();
    });

    it.each<{ values: unknown }>([
      { values: { extra: 'Admin' } },
      { values: { extra: undefined } },
      { values: { toString: 'Admin' } },
      { values: { [Symbol('extra')]: 'Admin' } }
    ])('rejects undeclared parts: $values', ({ values }) => {
      const { createLayout, pattern } = setup();
      expect(() => createLayout(values)).toThrowError(InvalidPartError);
      expect(pattern).not.toHaveBeenCalled();
    });

    it('preserves optional values, numeric zero, and valid values', () => {
      const { createLayout } = setup();
      expect(createLayout({}).displayName).toBe('UsersV');
      expect(
        createLayout({ section: undefined, version: undefined })
          .displayName
      ).toBe('UsersV');
      expect(
        createLayout({ section: 'Admin', version: 0 }).displayName
      ).toBe('AdminUsersV0');
      expect(
        createLayout({ section: 'Admin', version: 2 }).displayName
      ).toBe('AdminUsersV2');
    });

    it('reports the part name and expected and received kinds', () => {
      const { createLayout } = setup();
      expect.assertions(3);
      try {
        createLayout({ version: '2' });
      } catch (error) {
        expect(error).toBeInstanceOf(ReactLayoutError);
        expect(error).toMatchObject({
          name: 'InvalidPartTypeError',
          code: 'invalidPartType',
          scope: 'namingPart',
          context: {
            part: 'version',
            expectedType: 'number',
            receivedType: 'string'
          }
        });
        expect(error).toHaveProperty(
          'message',
          expect.stringContaining('version')
        );
      }
    });

    it('reports valid keys for an undeclared part', () => {
      const { createLayout } = setup();
      expect.assertions(2);
      try {
        createLayout({ extra: 'Admin' });
      } catch (error) {
        expect(error).toBeInstanceOf(ReactLayoutError);
        expect(error).toMatchObject({
          name: 'InvalidPartError',
          code: 'invalidPart',
          scope: 'namingPart',
          context: { part: 'extra', validParts: ['section', 'version'] }
        });
      }
    });

    if (source === 'object') {
      it('rejects invalid fixed values immediately', () => {
        const { naming } = setup();
        expect(() =>
          Reflect.apply(naming, undefined, [{ version: '2' }])
        ).toThrowError(InvalidPartTypeError);
      });
    }
  }
);

it('validates the default string parts and custom spread-defined parts', () => {
  const standard = defineLayoutName(
    (_context, parts) => `${parts.prefix}${parts.append}`
  );
  const custom = defineLayoutName
    .defineParts('section', 'suffix')
    .namingFn((_context, parts) => `${parts.section}${parts.suffix}`);
  expect(() =>
    Reflect.apply(standard, undefined, [{ prefix: 2 }])
  ).toThrowError(InvalidPartTypeError);
  expect(() =>
    Reflect.apply(standard, undefined, [{ extra: 'Admin' }])
  ).toThrowError(InvalidPartError);
  expect(() =>
    Reflect.apply(custom, undefined, [{ suffix: 2 }])
  ).toThrowError(InvalidPartTypeError);
  expect(() =>
    Reflect.apply(custom, undefined, [{ extra: 'Admin' }])
  ).toThrowError(InvalidPartError);
});
