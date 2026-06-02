import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { createPrimitivePropBuilder, createProp, validateProps } from '../src';

describe('create-value', () => {
  it('validates literal and enum primitive props', () => {
    const literalProp = createPrimitivePropBuilder('string').literal('users');
    const enumProp = createPrimitivePropBuilder('number').enum([1, 2, 3]);

    expect(literalProp('users')).toBeUndefined();
    expect(enumProp(2)).toBeUndefined();
    expect(() => literalProp('teams')).toThrow(
      '"value" is not of type "string".',
    );
    expect(() => enumProp(4)).toThrow('"value" is not of type "number".');
  });

  it('validates nested objects and optional props', () => {
    const shape = {
      title: createProp.string(),
      metadata: createProp.object({
        count: createProp.number(),
        isVisible: createProp.boolean.optional()(),
      }),
    };

    const props = validateProps(shape, {
      title: 'Users',
      metadata: {
        count: 3,
      },
    });

    expect(props).toEqual({
      title: 'Users',
      metadata: {
        count: 3,
      },
    });
  });

  it('throws when required props are missing', () => {
    const shape = {
      title: createProp.string(),
      subtitle: createProp.string.optional()(),
    };

    expect(() => validateProps(shape, {})).toThrow(
      'Property "title" is required but not provided.',
    );
  });

  it('supports union props and JSX element props', () => {
    const unionProp = createProp.string().or(createProp.number());
    const elementProp = createProp.component({ type: 'JSX.Element' });
    const element = createElement('div', null, 'slot');

    expect(unionProp('users')).toBeUndefined();
    expect(unionProp(42)).toBeUndefined();
    expect(() => unionProp(false)).toThrow('"value" is not of type "union".');

    expect(elementProp(element)).toBeUndefined();
    expect(() => elementProp('not-an-element')).toThrow(
      '"value" is not of type "JSX.Element".',
    );
  });

  it('supports JSX element with props', () => {
    const elementProp = createProp.component({ type: 'JSX.Element' }).props({
      title: createProp.string(),
    });

    const element = createElement('div', { title: 'Users' }, 'slot');

    expect(elementProp(element)).toBeUndefined();
  });
});
