import { describe, expect, expectTypeOf, it } from 'vitest';
import { createProp, PropError, validateProps, type ResolveProps } from '../src';

describe('array props', () => {
  it('validates primitive, nested, and union elements', () => {
    const tags = createProp.array(createProp.string());
    expect(tags([])).toEqual([]);
    expect(tags(['docs'])).toEqual(['docs']);
    expect(() => tags('docs')).toThrow(PropError);
    expect(() => tags([1])).toThrow(PropError);
    expect(tags._baseProp.allows([1])).toBe(false);
    expect(tags._baseProp.allows(['docs'])).toBe(true);
    const values = createProp.array(createProp.string().or(createProp.number()));
    expect(values(['docs', 1])).toEqual(['docs', 1]);
    expect(createProp.array(tags)([['docs']])).toEqual([['docs']]);
  });

  it('retains element paths through object and array validation', () => {
    const shape = {
      entries: createProp.array(
        createProp.object({
          title: createProp.string(),
        }),
      ),
    };
    try {
      validateProps(shape, {
        entries: [
          {
            title: 1,
          },
        ],
      });
      throw new Error('Expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(PropError);
      expect((error as PropError).path).toBe('entries.0.title');
    }
  });

  it('infers elements and supports optional arrays and unions', () => {
    const shape = {
      tags: createProp.array(createProp.string()).optional(),
      entries: createProp.array(
        createProp.object({
          title: createProp.string(),
        }),
      ),
    };
    expectTypeOf<ResolveProps<typeof shape>>().toMatchTypeOf<
      {
        entries: { title: string }[];
      } & { tags?: string[] }
    >();
    expect(
      validateProps(shape, {
        entries: [],
      }),
    ).toEqual({
      entries: [],
    });
    expect(() =>
      createProp.array(createProp.string()).or(createProp.boolean())(true),
    ).not.toThrow();
  });
});
