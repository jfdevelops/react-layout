import { createRoot } from 'react-dom/client';
import { defineResourceLayout } from '@jfdevelops/react-layout';
import { ReactLayoutDevtools } from '@jfdevelops/react-layout-devtools-react';

let violations = 0;

document.addEventListener('securitypolicyviolation', (event) => {
  if (!event.effectiveDirective.startsWith('style-src')) return;

  violations += 1;

  const output = document.getElementById('style-violations');

  if (output) output.textContent = String(violations);

  const list = document.getElementById('style-violation-details');
  const item = document.createElement('li');

  item.textContent = `${event.effectiveDirective}: ${event.blockedURI} ${event.sourceFile}:${event.lineNumber} ${event.sample}`;
  list?.appendChild(item);
});

const definition = defineResourceLayout({
  resources: ['example'],
  layout: {
    render: {
      default: () => <p>Default resource state</p>,
      Loading: () => <p>Loading resource state</p>,
    },
  },
});

const Page = definition.createResourceLayout({
  name: 'CspExample',
  resource: 'example',
});

const root = document.getElementById('root');

if (!root) throw new Error('Missing CSP example root');

createRoot(root).render(
  <>
    <h1>Strict style CSP verification</h1>
    <p>Policy: nonce-authorized stylesheet; style attributes disallowed.</p>
    <p>
      Style CSP violations: <output id="style-violations">{violations}</output>
    </p>
    <ul id="style-violation-details" />
    <Page />
    <ReactLayoutDevtools
      source={definition}
      initialIsOpen
      nonce="react-layout-csp-example"
    />
  </>
);
