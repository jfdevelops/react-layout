import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import {
  builtIn,
  getSchemaAtPath,
  type InferableSchema,
  InvalidSchemaPathError,
  type SchemaPath,
  type StandardSchemaV1,
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
  it('lists every path into the value', () => {
    expectTypeOf<
      SchemaPath<StandardSchemaV1.InferOutput<typeof page>>
    >().toEqualTypeOf<
      | 'title'
      | 'tags'
      | 'tags.[number]'
      | 'tags.[number].label'
      | 'tags.[number].color'
      | 'links'
      | 'links.[string]'
      | 'links.[string].href'
      | 'size'
      | 'size.0'
      | 'size.1'
      | 'meta'
      | 'meta.author'
      | 'extra'
      | 'extra.note'
    >();
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

  it('rejects a segment that does not exist or cannot be followed', () => {
    const unknown = captureError(() =>
      getSchemaAtPath(page, 'tags.0' as never),
    );
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
