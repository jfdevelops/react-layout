import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  collectComposablePresetEntries,
  LayoutComposablePresetProvider,
} from '@jfdevelops/react-layout-composables';
import { createHeaderComposable, createMetaComposable } from '../src';
import { createCopyComposable } from '../src/contract';

afterEach(cleanup);

describe('copy contract', () => {
  it('renders a title with an optional description', () => {
    const { Copy } = createCopyComposable(({ title, description }) => (
      <p>
        {title}
        {description ? `: ${description}` : null}
      </p>
    ));
    const view = render(<Copy title='Users' />);

    expect(screen.getByText('Users')).toBeInTheDocument();
    view.rerender(<Copy title='Users' description='Manage users' />);
    expect(screen.getByText('Users: Manage users')).toBeInTheDocument();
  });

  it('requires a title', () => {
    const { Copy } = createCopyComposable(() => null);

    expect(() => render(createElement(Copy, {} as never))).toThrow(
      /Invalid prop "title/,
    );
  });
});

describe('copy presets', () => {
  const header = createHeaderComposable(({ eyebrow, title, description }) => (
    <header>
      {eyebrow ? <span>{eyebrow}</span> : null}
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </header>
  ));
  const meta = createMetaComposable(
    ({ title, description, canonical, isIndexable }) => (
      <dl>
        <dd>{`document: ${title}`}</dd>
        <dd>{`summary: ${description}`}</dd>
        <dd>{`canonical: ${canonical}`}</dd>
        <dd>{`indexable: ${isIndexable ?? true}`}</dd>
      </dl>
    ),
  );

  it('adds the props of each preset to the shared copy', () => {
    render(
      <>
        <header.Header eyebrow='Admin' title='Users' />
        <meta.Meta
          title='Users'
          description='Manage users'
          canonical='/users'
          isIndexable={false}
        />
      </>,
    );
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Users',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('canonical: /users')).toBeInTheDocument();
    expect(screen.getByText('indexable: false')).toBeInTheDocument();
  });

  it('feeds one title and description to both presets', () => {
    const shared = {
      title: 'Users',
      description: 'Manage users',
    };

    expect(
      collectComposablePresetEntries({
        ...header,
        ...meta,
      }).map(({ key }) => key),
    ).toEqual(['Header', 'Meta']);
    expect(createHeaderComposable.props.title).toBe(
      createMetaComposable.props.title,
    );
    render(
      <LayoutComposablePresetProvider
        value={{
          Header: shared,
          Meta: shared,
        }}
      >
        <header.Header
          {...({} as {
            title: string;
          })}
        />
        <meta.Meta
          {...({} as {
            title: string;
          })}
        />
      </LayoutComposablePresetProvider>,
    );
    expect(
      screen.getByRole('heading', {
        name: 'Users',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('document: Users')).toBeInTheDocument();
    expect(screen.getByText('summary: Manage users')).toBeInTheDocument();
  });

  it('gives the header its own title through a rename', () => {
    const { Header } = createHeaderComposable({
      rename: {
        title: 'heading',
      },
      render: ({ heading }) => <h1>{heading}</h1>,
    });

    expect(
      collectComposablePresetEntries({
        Header,
        ...meta,
      }).map(({ props }) => Object.keys(props)),
    ).toEqual([
      ['heading', 'description', 'eyebrow'],
      ['title', 'description', 'canonical', 'image', 'isIndexable'],
    ]);
  });
});
