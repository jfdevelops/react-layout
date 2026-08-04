import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import {
  createPrimitivePropBuilder,
  createProp,
  PropError,
  validateProps,
} from '../src';

describe('create-value', () => {
  it('validates literal and enum primitive props', () => {
    const literalProp = createPrimitivePropBuilder('string').literal('users');
    const enumProp = createPrimitivePropBuilder('number').enum([1, 2, 3]);

    expect(literalProp('users')).toBeUndefined();
    expect(enumProp(2)).toBeUndefined();
    expect(() => literalProp('teams')).toThrow(
      'Invalid prop "value": expected "string", received "string".',
    );
    expect(() => enumProp(4)).toThrow(
      'Invalid prop "value": expected "number", received "number".',
    );
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
      'Missing required prop "title".',
    );
  });

  it('exposes structured details without expanding the message', () => {
    const shape = {
      segments: createProp.record(createProp.string()),
    };
    let error: PropError | undefined;

    try {
      validateProps(
        shape,
        { title: 'Contacts' },
        {
          layoutName: 'ContactsPage',
          resource: 'contacts',
        },
      );
    } catch (caught) {
      error = caught as PropError;
    }

    expect(error).toMatchObject({
      name: 'PropError',
      layoutName: 'ContactsPage',
      path: 'segments',
      resource: 'contacts',
      received: ['title'],
      expected: ['segments'],
      message:
        'Missing required prop "segments" in layout "ContactsPage" (resource: "contacts").',
    });
  });

  it('creates prop errors from an options object', () => {
    const error = new PropError({
      layoutName: 'ContactsPage',
      path: 'segments',
      resource: 'contacts',
      received: ['title'],
      expected: ['segments'],
      message:
        'Missing required prop "segments" in layout "ContactsPage" (resource: "contacts").',
    });

    expect(error.name).toBe('PropError');
    expect(error.message).toBe(
      'Missing required prop "segments" in layout "ContactsPage" (resource: "contacts").',
    );
  });

  it('uses PropError for props with the wrong type', () => {
    const shape = {
      count: createProp.number(),
    };
    let error: PropError | undefined;

    try {
      validateProps(
        shape,
        { count: 'three' },
        {
          layoutName: 'ContactsPage',
          resource: 'contacts',
        },
      );
    } catch (caught) {
      error = caught as PropError;
    }

    expect(error).toBeInstanceOf(PropError);
    expect(error).toMatchObject({
      name: 'PropError',
      layoutName: 'ContactsPage',
      path: 'count',
      resource: 'contacts',
      received: 'string',
      expected: 'number',
      message:
        'Invalid prop "count" in layout "ContactsPage" (resource: "contacts"): expected "number", received "string".',
    });
  });

  it('supports union props and JSX element props', () => {
    const unionProp = createProp.string().or(createProp.number());
    const elementProp = createProp.component({ type: 'JSX.Element' });
    const element = createElement('div', null, 'slot');

    expect(unionProp('users')).toBeUndefined();
    expect(unionProp(42)).toBeUndefined();
    expect(() => unionProp(false)).toThrow(
      'Invalid prop "value": expected "union", received "boolean".',
    );

    expect(elementProp(element)).toBeUndefined();
    expect(() => elementProp('not-an-element')).toThrow(
      'Invalid prop "value": expected "JSX.Element", received "string".',
    );
  });

  it('validates record props with literal and string keys', () => {
    const segmentValue = createProp
      .string()
      .or(
        createProp.object({
          value: createProp.string(),
          isActive: createProp.boolean.optional()(),
        }),
      );
    const segments = createProp.record({
      value: segmentValue,
      key: createProp
        .string()
        .literal('contacts')
        .or(createProp.string()),
    });

    const props = validateProps(
      { segments },
      {
        segments: {
          contacts: { value: 'Contacts', isActive: false },
          'single-male': 'Single Males',
        },
      },
    );

    expect(props).toEqual({
      segments: {
        contacts: { value: 'Contacts', isActive: false },
        'single-male': 'Single Males',
      },
    });
    expect(() =>
      segments({
        contacts: 42,
      }),
    ).toThrow(
      'Invalid prop "value": expected "union", received "number".',
    );
    const strictSegments = createProp.record({
      value: createProp.string(),
      key: createProp
        .string()
        .literal('contacts')
        .or(createProp.string().literal('single-male')),
    });

    expect(() =>
      strictSegments({
        groups: 'Groups',
      }),
    ).toThrow('"groups" is not an allowed record key.');
  });

  it('supports record props with only string keys', () => {
    const labels = createProp.record(createProp.string());

    expect(labels({ alpha: 'Alpha', beta: 'Beta' })).toEqual({
      alpha: 'Alpha',
      beta: 'Beta',
    });
  });

  it('supports JSX element with props', () => {
    const elementProp = createProp.component({ type: 'JSX.Element' }).props({
      title: createProp.string(),
    });

    const element = createElement('div', { title: 'Users' }, 'slot');

    expect(elementProp(element)).toBeUndefined();
  });
});
