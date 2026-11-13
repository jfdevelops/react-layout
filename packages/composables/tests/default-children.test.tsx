import { render, screen } from '@testing-library/react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ReactNode } from 'react';
import { defineComposableComponent } from '../src';
import { z } from 'zod';
import { reactNode } from '@jfdevelops/react-layout-adapter-zod';

describe('default composable children', () => {
  const createContainer = defineComposableComponent({
    name: 'Container',
  });

  it('forwards children to the callback overload with no explicit props', () => {
    const { Container } = createContainer(({ children }) => {
      expectTypeOf(children).toEqualTypeOf<ReactNode>();

      return <main>{children ?? 'Empty'}</main>;
    });
    const view = render(<Container>Content</Container>);
    expect(screen.getByText('Content')).toBeInTheDocument();
    view.rerender(<Container />);
    expect(screen.getByText('Empty')).toBeInTheDocument();
  });

  it('forwards children alongside added props in the object overload', () => {
    const { Container } = createContainer({
      props: {
        title: z.string(),
      },
      render: ({ children, title }) => (
        <section>
          <h1>{title}</h1>
          {children}
        </section>
      ),
    });
    render(<Container title='Title'>Object content</Container>);
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Object content')).toBeInTheDocument();
  });

  it('retains explicit legacy children validators', () => {
    const createRequired = defineComposableComponent({
      name: 'Required',
      props: {
        children: reactNode(),
      },
    });
    const { Required } = createRequired(({ children }) => (
      <main>{children}</main>
    ));
    render(<Required>Validated content</Required>);
    expect(screen.getByText('Validated content')).toBeInTheDocument();
  });

  it('allows an explicit non-ReactNode children schema to override the default', () => {
    const createCustom = defineComposableComponent({
      name: 'Custom',
      props: {
        children: z.object({
          label: z.string(),
        }),
      },
    });
    const { Custom } = createCustom(({ children }) => {
      expectTypeOf(children).toEqualTypeOf<{ label: string }>();

      return <p>{children.label}</p>;
    });

    render(
      <Custom>
        {{
          label: 'Custom children',
        }}
      </Custom>,
    );
    expect(screen.getByText('Custom children')).toBeInTheDocument();
  });
});
