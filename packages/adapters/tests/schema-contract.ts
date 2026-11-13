import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import type { createAdapter } from '../src';

export function describeSchemaContract(
  adapter: ReturnType<typeof createAdapter>,
) {
  describe('React schemas', () => {
    it('validates React nodes and rejects unsupported values', async () => {
      const schema = adapter.reactNode();
      const element = createElement('span', null, 'Content');

      for (const value of [
        'text',
        42,
        false,
        null,
        element,
        [element, 'text'],
      ]) {
        expect(await schema['~standard'].validate(value)).toMatchObject({
          value,
        });
      }

      for (const value of [undefined, {}, () => null, Symbol('invalid')]) {
        const result = await schema['~standard'].validate(value);

        expect(result.issues).toBeDefined();
      }
    });

    it('accepts elements while rejecting other valid node types', async () => {
      const schema = adapter.reactElement();
      const value = createElement('strong', null, 'Content');

      expect(await schema['~standard'].validate(value)).toMatchObject({
        value,
      });

      for (const value of ['text', 42, false, null, undefined, [], {}]) {
        const result = await schema['~standard'].validate(value);

        expect(result.issues).toBeDefined();
      }
    });
  });
}
