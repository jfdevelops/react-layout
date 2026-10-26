import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { expect, it } from 'vitest';
import { createInspectionStore } from '@jfdevelops/react-layout-devtools-core';
import {
  ReactLayoutDevtools,
  ReactLayoutDevtoolsContent,
  ReactLayoutDevtoolsProvider,
  ReactLayoutDevtoolsToolbar,
} from '../src';

it('attaches the per-response nonce to the shared stylesheet without saving it', () => {
  const view = render(
    <ReactLayoutDevtools
      source={createInspectionStore()}
      initialIsOpen
      nonce="request-nonce"
    />
  );
  const styles = document.querySelectorAll(
    'style[data-react-layout-devtools-styles]'
  );

  expect(styles).toHaveLength(1);
  expect(styles[0]).toHaveAttribute('nonce', 'request-nonce');
  expect(styles[0].textContent).toContain(
    '@keyframes react-layout-devtools-enter'
  );
  expect(styles[0].textContent).toContain('prefers-reduced-motion');
  expect(JSON.stringify({ ...localStorage })).not.toContain('request-nonce');

  view.unmount();

  expect(
    document.querySelector('style[data-react-layout-devtools-styles]')
  ).toBeNull();
});

it('does not inject styles in external stylesheet mode, including custom compositions', () => {
  render(
    <ReactLayoutDevtoolsProvider
      source={createInspectionStore()}
      styleMode="external"
    >
      <ReactLayoutDevtoolsToolbar />
    </ReactLayoutDevtoolsProvider>
  );

  expect(
    document.querySelector('style[data-react-layout-devtools-styles]')
  ).toBeNull();
});

it('does not emit inspector style tags or style attributes during server rendering', () => {
  const source = createInspectionStore();

  expect(
    renderToString(
      <ReactLayoutDevtoolsContent source={source} nonce="server-nonce" />
    )
  ).toBe('');
  expect(
    renderToString(
      <ReactLayoutDevtools source={source} initialIsOpen nonce="server-nonce" />
    )
  ).toBe('');
  expect(
    renderToString(
      <ReactLayoutDevtoolsProvider source={source}>
        <ReactLayoutDevtoolsToolbar />
      </ReactLayoutDevtoolsProvider>
    )
  ).toBe('');
});
