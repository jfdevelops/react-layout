import { cleanup, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, expectTypeOf, it, vi } from 'vitest';
import { reservedScopedCompoundStaticKeys, withScopedCompoundStatics } from '../../src/create-config/for-resources/scoped-render';
import type { ScopedComponentCompoundStaticKey, ScopedComponentCompoundStatics } from '../../src/create-config/for-resources/create-component';

afterEach(cleanup);

it('ignores React inspection keys on client and server while preserving compound identity', () => {
  const create = vi.fn(() => () => <p>Loading</p>);
  const Wrapper = withScopedCompoundStatics(() => <p>Table</p>, create);
  for (const key of [
    'getDerivedStateFromProps', 'getDerivedStateFromError', 'contextType',
    'getDefaultProps', 'getChildContext', 'type', 'compare', 'render',
    '_context', '_payload', '_init', 'then', 'childContextTypes', 'contextTypes',
    'defaultProps', 'propTypes', 'PropTypes', '$$typeof', '', '123',
  ]) expect(Wrapper[key]).toBeUndefined();
  expect(create).not.toHaveBeenCalled();
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    expect(renderToString(<Wrapper />)).toContain('Table');
    render(<Wrapper />);
    expect(screen.getByText('Table')).toBeInTheDocument();
    expect(error).not.toHaveBeenCalled();
  } finally {
    error.mockRestore();
  }
  expect(Wrapper.Loading).toBe(Wrapper.Loading);
  expect(create).toHaveBeenCalledExactlyOnceWith('Loading');
});

it('only exposes uppercase compound components in the type contract', () => {
  type Component = (() => React.JSX.Element) & {
    Loading: () => React.JSX.Element;
    getDerivedStateFromProps: () => React.JSX.Element;
    render: () => React.JSX.Element;
    PropTypes: () => React.JSX.Element;
    _init: () => React.JSX.Element;
    then: () => React.JSX.Element;
  };
  expectTypeOf<ScopedComponentCompoundStaticKey>().toEqualTypeOf<typeof reservedScopedCompoundStaticKeys[number]>();
  expectTypeOf<keyof ScopedComponentCompoundStatics<Component>>().toEqualTypeOf<'Loading'>();
});
