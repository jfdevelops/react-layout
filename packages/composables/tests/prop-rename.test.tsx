import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  collectComposablePresetEntries,
  composablePresetMetaKey,
  ConflictingPresetPropError,
  defineComposableComponent,
  InvalidPropRenameError,
  LayoutComposablePresetProvider,
} from '../src';
import { z } from 'zod';

function captureError(run: () => unknown) {
  try {
    run();
  } catch (error) {
    return error;
  }

  return undefined;
}

describe('defined composable prop renames', () => {
  const createList = defineComposableComponent({
    name: 'List',
    props: {
      items: z.array(z.string()),
      separator: z.string(),
    },
  });

  it('exposes its definitions under its name', () => {
    const createTabs = createList.extend({
      name: 'Tabs',
    });

    expect(createList.List.props).toBe(createList.props);
    expect(createList.List.infer).toBeUndefined();
    expect(createTabs.Tabs.props.items).toBe(createList.props.items);
    expect(
      createList.List.props.items['~standard'].validate(['a']),
    ).toMatchObject({
      value: ['a'],
    });
    expect(Object.keys(createList)).toEqual(['props']);
  });

  it('renames a prop while keeping its definition', () => {
    const { List } = createList({
      rename: {
        items: 'tabs',
      },
      render: ({ tabs, separator }) => tabs.join(separator),
    });
    const definitions = List[composablePresetMetaKey].props;

    expect(definitions.tabs).toBe(createList.props.items);
    expect(definitions).not.toHaveProperty('items');
    expect(createList.props).toHaveProperty('items');
    render(<List tabs={['One', 'Two']} separator=' | ' />);
    expect(screen.getByText('One | Two')).toBeInTheDocument();
  });

  it('renames a prop and replaces its definition', () => {
    const { List } = createList({
      rename: {
        items: {
          name: 'count',
          schema: z.number(),
        },
      },
      render: ({ count, separator }) => `${count}${separator}`,
    });

    expect(List[composablePresetMetaKey].props.count.type).toBe('number');
    render(<List count={2} separator='!' />);
    expect(screen.getByText('2!')).toBeInTheDocument();
    expect(() =>
      render(
        createElement(List, {
          count: 'two',
          separator: '!',
        } as never),
      ),
    ).toThrow(/Invalid prop "count/);
  });

  it('applies prop overrides after renames', () => {
    const { List } = createList({
      rename: {
        items: 'tabs',
      },
      props: {
        tabs: z.array(z.number()),
        label: z.string(),
      },
      render: ({ tabs, label }) => `${label}${tabs.length}`,
    });

    render(<List tabs={[1, 2]} label='Tabs: ' separator=',' />);
    expect(screen.getByText('Tabs: 2')).toBeInTheDocument();
  });

  it('derives a factory that reads its renamed prop from a layout provider', () => {
    const createTabs = createList.extend({
      name: 'Tabs',
      rename: {
        items: 'tabs',
      },
    });
    const { Tabs } = createTabs(({ tabs, separator }) => tabs.join(separator));

    expect(createTabs.props.tabs).toBe(createList.props.items);
    expect(Tabs.displayName).toBe('Tabs');
    expect(Tabs[composablePresetMetaKey].key).toBe('Tabs');
    render(
      <LayoutComposablePresetProvider
        value={{
          Tabs: {
            tabs: ['One', 'Two'],
            separator: ' / ',
          },
        }}
      >
        <Tabs {...({} as { tabs: string[]; separator: string })} />
      </LayoutComposablePresetProvider>,
    );
    expect(screen.getByText('One / Two')).toBeInTheDocument();
  });

  it.each([
    [
      'reserved',
      {
        items: 'children',
      },
    ],
    [
      'duplicate',
      {
        items: 'separator',
      },
    ],
    [
      'unknown',
      {
        missing: 'other',
      },
    ],
  ])('rejects a %s rename', (reason, rename) => {
    const error = captureError(() =>
      createList.extend({
        rename: rename as never,
      }),
    );

    expect(error).toBeInstanceOf(InvalidPropRenameError);
    expect((error as InvalidPropRenameError).context).toMatchObject({
      composable: 'List',
      reason,
    });
  });

  it('reports the name requested for a prop that is not defined', () => {
    const error = captureError(() =>
      createList.extend({
        rename: {
          missing: {
            name: 'other',
            schema: z.string(),
          },
        } as never,
      }),
    );

    expect((error as InvalidPropRenameError).context).toEqual({
      composable: 'List',
      prop: 'missing',
      name: 'other',
      reason: 'unknown',
    });
  });
});

describe('preset prop conflicts', () => {
  const createCopy = defineComposableComponent({
    name: 'Copy',
    props: {
      title: z.string(),
    },
  });

  it('lets presets built from one definition share a prop', () => {
    const header = createCopy.extend({
      name: 'Header',
    })(({ title }) => title);
    const meta = createCopy.extend({
      name: 'Meta',
      props: {
        canonical: z.string(),
      },
    })(({ title }) => title);

    expect(
      collectComposablePresetEntries({
        ...header,
        ...meta,
      }).map(({ key }) => key),
    ).toEqual(['Header', 'Meta']);
  });

  it('rejects presets that declare one prop with different definitions', () => {
    const header = createCopy.extend({
      name: 'Header',
    })(({ title }) => title);
    const meta = createCopy.extend({
      name: 'Meta',
      props: {
        title: z.number(),
      },
    })(({ title }) => title);
    const collect = () =>
      collectComposablePresetEntries({
        ...header,
        ...meta,
      });

    expect(collect).toThrow(ConflictingPresetPropError);
    expect(collect).toThrow(
      'Composables "Header" and "Meta" both declare prop "title" with different definitions.',
    );
  });
});
