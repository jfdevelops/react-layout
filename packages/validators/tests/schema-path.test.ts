import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import {
  builtIn,
  createPropValidator,
  getSchemaAtPath,
  type InferableSchema,
  InvalidSchemaPathError,
  type SchemaPath,
} from '../src';

const tag = builtIn.object({
  label: builtIn.string,
  color: builtIn.string.optional(),
});
const page = builtIn.object({
  title: builtIn.string,
  tags: builtIn.array(tag),
  links: builtIn.record(
    builtIn.union(
      builtIn.string,
      builtIn.object({
        href: builtIn.string,
      }),
    ),
  ),
  size: builtIn.tuple(builtIn.number, builtIn.number),
  meta: builtIn
    .object({
      author: builtIn.string,
    })
    .optional(),
  extra: z.object({
    note: z.string(),
  }),
});

function captureError(run: () => unknown) {
  try {
    run();
  } catch (error) {
    return error;
  }

  return undefined;
}

describe('getSchemaAtPath', () => {
  it('suggests only the next supported segment', () => {
    expectTypeOf<SchemaPath<typeof page>>().toEqualTypeOf<
      'title' | 'tags' | 'links' | 'size' | 'meta' | 'extra'
    >();
    expectTypeOf<
      SchemaPath<typeof page, 'tags.'>
    >().toEqualTypeOf<'tags.[number]'>();
    expectTypeOf<SchemaPath<typeof page, 'tags.[number].'>>().toEqualTypeOf<
      'tags.[number].label' | 'tags.[number].color'
    >();
    expectTypeOf<SchemaPath<typeof page, 'extra.'>>().toEqualTypeOf<never>();
  });

  it('follows object keys, record keys, array items and tuple indexes', () => {
    const title = getSchemaAtPath(page, 'title');
    const label = getSchemaAtPath(page, 'tags.[number].label');
    const color = getSchemaAtPath(page, 'tags.[number].color');
    const width = getSchemaAtPath(page, 'size.0');

    expectTypeOf(title).toEqualTypeOf<InferableSchema<string>>();
    expectTypeOf(color).toEqualTypeOf<InferableSchema<string | undefined>>();
    expectTypeOf<typeof color.infer>().toEqualTypeOf<string | undefined>();
    expectTypeOf(width).toEqualTypeOf<InferableSchema<number>>();
    expect(title).toBe(builtIn.string);
    expect(label).toBe(builtIn.string);
    expect(color).toBe(builtIn.string.optional());
    expect(width).toBe(builtIn.number);
    expect(getSchemaAtPath(page, 'tags.[number]')).toBe(tag);
  });

  it('follows the union member and the optional schema a segment leads into', () => {
    const href = getSchemaAtPath(page, 'links.[string].href');

    expectTypeOf(href).toEqualTypeOf<InferableSchema<string>>();
    expect(href).toBe(builtIn.string);
    expect(getSchemaAtPath(page, 'meta.author')).toBe(builtIn.string);
  });

  it('validates every union member at a shared leaf', () => {
    const schema = builtIn.union(
      builtIn.object({
        value: builtIn.string,
      }),
      builtIn.object({
        value: builtIn.number,
      }),
    );
    const value = getSchemaAtPath(schema, 'value');

    expectTypeOf<typeof value.infer>().toEqualTypeOf<string | number>();
    expect(value['~standard'].validate('hello')).toEqual({
      value: 'hello',
    });
    expect(value['~standard'].validate(42)).toEqual({
      value: 42,
    });
  });

  it('follows all union branches that share a segment', () => {
    const schema = builtIn.union(
      builtIn.object({
        item: builtIn.object({
          label: builtIn.string,
        }),
      }),
      builtIn.object({
        item: builtIn.object({
          count: builtIn.number,
        }),
      }),
    );
    const count = getSchemaAtPath(schema, 'item.count');

    expectTypeOf<typeof count.infer>().toEqualTypeOf<number>();
    expect(count).toBe(builtIn.number);
  });

  it('checks a requested path beyond the previous five-segment limit', () => {
    const schema = builtIn.object({
      a: builtIn.object({
        b: builtIn.object({
          c: builtIn.object({
            d: builtIn.object({
              e: builtIn.object({
                f: builtIn.string,
              }),
            }),
          }),
        }),
      }),
    });
    const leaf = getSchemaAtPath(schema, 'a.b.c.d.e.f');

    expectTypeOf<typeof leaf.infer>().toEqualTypeOf<string>();
    expect(leaf).toBe(builtIn.string);
  });

  it('stops at custom validators even when their output has properties', () => {
    const custom = createPropValidator(() => ({
      note: 'hello',
    }));
    const schema = builtIn.object({
      custom,
    });

    expect(getSchemaAtPath(schema, 'custom')).toBe(custom);
    // @ts-expect-error The output shape is not a tree of child validators.
    expect(() => getSchemaAtPath(schema, 'custom.note')).toThrow(
      InvalidSchemaPathError,
    );
  });

  it('rejects a segment that does not exist or cannot be followed', () => {
    const unknown = captureError(() =>
      getSchemaAtPath(page, 'tags.0' as never),
    );
    // @ts-expect-error External schemas do not expose traversable children.
    const opaque = captureError(() => getSchemaAtPath(page, 'extra.note'));

    expect(unknown).toBeInstanceOf(InvalidSchemaPathError);
    expect((unknown as InvalidSchemaPathError).context).toEqual({
      path: 'tags.0',
      segment: '0',
      reason: 'unknown',
    });
    expect(opaque).toBeInstanceOf(InvalidSchemaPathError);
    expect((opaque as InvalidSchemaPathError).context).toEqual({
      path: 'extra.note',
      segment: 'note',
      reason: 'opaque',
    });
    // @ts-expect-error Only listed paths are accepted.
    captureError(() => getSchemaAtPath(page, 'missing'));
  });
});
