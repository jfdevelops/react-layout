import { type } from 'arktype';
import { Schema } from 'effect';
import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createDefinedResourceLayout } from '../../src';

const validated = {
  zod: z.object({
    label: z.string(),
    count: z.number(),
  }),
  valibot: v.object({
    label: v.string(),
    count: v.number(),
  }),
  arktype: type({
    label: 'string',
    count: 'number',
  }),
};

function createLabelReader(nested: (typeof validated)[keyof typeof validated]) {
  const { createReusable } = createDefinedResourceLayout({
    resources: ['users'],
    options: {
      nested,
    },
  });

  return createReusable({
    props: {
      include: {
        options: {
          nested: {
            label: true,
          },
        },
      },
    },
    fn: (props) => props.nested.label,
  });
}

describe('nested reusable selections across schema libraries', () => {
  it.each(Object.entries(validated))(
    'selects and validates one field of a %s object',
    (_, nested) => {
      const read = createLabelReader(nested);

      expect(
        read({
          nested: {
            label: 'Docs',
          },
        }),
      ).toBe('Docs');
      expect(() =>
        read({
          nested: {
            label: 1 as never,
          },
        }),
      ).toThrow(/label/);
    },
  );

  it('selects a field of a schema whose fields cannot be read, without validating it alone', () => {
    // Effect does not expose field schemas the way the others do.
    const read = createLabelReader(
      Schema.toStandardSchemaV1(
        Schema.Struct({
          label: Schema.String,
          count: Schema.Number,
        }),
      ) as never,
    );

    expect(
      read({
        nested: {
          label: 'Docs',
        },
      }),
    ).toBe('Docs');
    expect(
      read({
        nested: {
          label: 1 as never,
        },
      }),
    ).toBe(1);
  });
});
