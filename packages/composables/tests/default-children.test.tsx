import { render, screen } from '@testing-library/react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ReactNode } from 'react';
import { createProp, defineComposableComponent } from '../src';

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
        title: createProp.string(),
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
        children: createProp.component({
          type: 'ReactNode',
        }),
      },
    });
    const { Required } = createRequired(({ children }) => <main>{children}</main>);
    render(<Required>Validated content</Required>);
    expect(screen.getByText('Validated content')).toBeInTheDocument();
  });
});
