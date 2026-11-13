import { createElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { createAdapter, type ReactCheck } from '../src';

function createTestSchema<Value>(check: ReactCheck<Value>) {
  return {
    parse(value: unknown) {
      if (!check(value)) {
        throw new TypeError('Invalid React value');
      }

      return value;
    },
    '~standard': {
      version: 1 as const,
      vendor: 'custom-test',
      validate(value: unknown) {
        return check(value)
          ? {
              value,
            }
          : {
              issues: [
                {
                  message: 'Invalid React value',
                },
              ],
            };
      },
    },
  };
}

describe('createAdapter', () => {
  it('provides typed predicates and preserves the constructors native schema types', () => {
    const { reactNode, reactElement } = createAdapter({
      node: (check) => {
        expectTypeOf(check).toEqualTypeOf<
          ReactCheck<Exclude<ReactNode, undefined>>
        >();

        return createTestSchema(check);
      },
      element: (check) => {
        expectTypeOf(check).toEqualTypeOf<ReactCheck<ReactElement>>();

        return createTestSchema(check);
      },
    });
    const node = reactNode();
    const element = reactElement();
    expectTypeOf(node.parse('text')).toEqualTypeOf<
      Exclude<ReactNode, undefined>
    >();
    expectTypeOf(
      element.parse(createElement('span')),
    ).toEqualTypeOf<ReactElement>();

    for (const value of [
      'text',
      1,
      null,
      false,
      createElement('span'),
      new Set(['text']),
    ]) {
      expect(node.parse(value)).toBe(value);
    }
    for (const value of [
      undefined,
      {},
      () => createElement('span'),
      {
        $$typeof: Symbol('fake'),
      },
    ]) {
      expect(() => node.parse(value)).toThrow('Invalid React value');
    }
    expect(element.parse(createElement('span')).type).toBe('span');
    for (const value of ['text', null, [], () => createElement('span')]) {
      expect(() => element.parse(value)).toThrow('Invalid React value');
    }
  });

  it('constructs a fresh schema only when the corresponding helper is called', () => {
    let nodeCalls = 0;
    let elementCalls = 0;
    const adapter = createAdapter({
      node: (check) => {
        nodeCalls++;

        return createTestSchema(check);
      },
      element: (check) => {
        elementCalls++;

        return createTestSchema(check);
      },
    });
    expect([nodeCalls, elementCalls]).toEqual([0, 0]);
    expect(adapter.reactNode()).not.toBe(adapter.reactNode());
    expect([nodeCalls, elementCalls]).toEqual([2, 0]);
    adapter.reactElement();
    expect([nodeCalls, elementCalls]).toEqual([2, 1]);
  });

  it('rejects cyclic collections and leaves one-shot iterators unconsumed', () => {
    const { reactNode } = createAdapter({
      node: createTestSchema,
      element: createTestSchema,
    });
    const cyclic: unknown[] = [];
    cyclic.push(cyclic);
    expect(() => reactNode().parse(cyclic)).toThrow('Invalid React value');
    function* children() {
      yield 'child';
    }
    const iterator = children();
    expect(() => reactNode().parse(iterator)).toThrow('Invalid React value');
    expect(iterator.next().value).toBe('child');
  });
});
