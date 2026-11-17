import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import {
  builtIn,
  defineComposableComponent,
  InvalidSchemaPathError,
} from '../src';
import type { StandardSchemaV1 } from '@jfdevelops/react-layout-validator';

function captureError(run: () => unknown) {
  try {
    run();
  } catch (error) {
    return error;
  }

  return undefined;
}

describe('getSchema', () => {
  const createList = defineComposableComponent({
    name: 'List',
    props: {
      items: builtIn.record(
        builtIn.object({
          value: builtIn.string,
          href: builtIn.string.optional(),
        }),
      ),
      title: z.string(),
    },
  });

  it('returns a prop definition by its composable and prop name', () => {
    const items = createList.getSchema('List.items');
    const title = createList.getSchema('List.title');

    expectTypeOf(items).toEqualTypeOf(createList.props.items);
    expectTypeOf(title).toEqualTypeOf(createList.props.title);
    expect(items).toBe(createList.props.items);
    expect(title).toBe(createList.props.title);
  });

  it('follows a path into a built-in definition', () => {
    const value = createList.getSchema('List.items.[string].value');
    const href = createList.getSchema('List.items.[string].href');

    expectTypeOf(value).toEqualTypeOf<StandardSchemaV1<unknown, string>>();
    expectTypeOf(href).toEqualTypeOf<
      StandardSchemaV1<unknown, string | undefined>
    >();
    expect(value).toBe(builtIn.string);
    expect(href).toBe(builtIn.string.optional());
    expect(href['~standard'].validate(1)).toMatchObject({
      issues: [
        {
          message: 'Expected a string',
        },
      ],
    });
  });

  it('reads an extended factory under its own names', () => {
    const createTabs = createList.extend({
      name: 'Tabs',
      rename: {
        items: 'tabs',
      },
    });

    expect(createTabs.getSchema('Tabs.tabs.[string].value')).toBe(
      builtIn.string,
    );
    // @ts-expect-error The extended factory has its own name.
    captureError(() => createTabs.getSchema('List.items'));
  });

  it('reads the definitions made from the default context values', () => {
    const createNotice = defineComposableComponent
      .defineContext({
        tones: {
          value: ['info', 'warning'] as const,
        },
      })
      .handler(({ tones }) => ({
        name: 'Notice',
        props: {
          tone: builtIn.literal(...tones),
        },
      }));

    expect(
      createNotice.getSchema('Notice.tone')['~standard'].validate('info'),
    ).toEqual({
      value: 'info',
    });
  });

  it('rejects a path that does not lead to a definition', () => {
    const name = captureError(() =>
      createList.getSchema('Menu.items' as never),
    );
    const deep = captureError(() =>
      createList.getSchema('List.items.[string].missing' as never),
    );

    expect(name).toBeInstanceOf(InvalidSchemaPathError);
    expect((name as InvalidSchemaPathError).context).toEqual({
      path: 'Menu.items',
      segment: 'Menu',
      reason: 'unknown',
    });
    expect((deep as InvalidSchemaPathError).context).toEqual({
      path: 'List.items.[string].missing',
      segment: 'missing',
      reason: 'unknown',
    });
    // @ts-expect-error A schema from another library is not followed.
    captureError(() => createList.getSchema('List.title.length'));
  });
});
