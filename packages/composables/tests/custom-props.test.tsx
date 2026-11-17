import { createElement, type ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import {
  defineComposableComponent,
  InvalidComposablePropsError,
  type ComposableProps,
  type CustomPropsObject,
} from '../src';

afterEach(cleanup);

describe('defined composable custom props', () => {
  it('defines props with the shared custom props object', () => {
    expectTypeOf<{
      title: z.ZodString;
      children: 'required';
    }>().toMatchTypeOf<CustomPropsObject>();
    expectTypeOf<{
      title: () => string;
    }>().toMatchTypeOf<ComposableProps>();
  });

  it('requires children with the shorthand', () => {
    const { Panel } = defineComposableComponent({
      name: 'Panel',
      props: {
        title: z.string(),
        children: 'required',
      },
    })(({ title, children }) => {
      expectTypeOf(title).toEqualTypeOf<string>();
      expectTypeOf(children).toEqualTypeOf<Exclude<ReactNode, undefined>>();

      return (
        <section>
          <h2>{title}</h2>
          {children}
        </section>
      );
    });

    render(
      <Panel title='Users'>
        <p>Content</p>
      </Panel>,
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
    // @ts-expect-error Children are required.
    <Panel title='Users' />;
    expect(() =>
      defineComposableComponent({
        name: 'Panel',
        props: {
          // @ts-expect-error Only children accepts the required shorthand.
          title: 'required',
        },
      }),
    ).toThrow(InvalidComposablePropsError);
    expect(() =>
      render(
        createElement(Panel, {
          title: 'Users',
        } as never),
      ),
    ).toThrow(/Invalid prop "children": Expected children/);
  });
});
