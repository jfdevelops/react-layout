import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createDefinedResourceLayout, ResourceModuleLoadError } from '../../src';

afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

function fixture() {
  const factory = createDefinedResourceLayout({ resources: ['users'] });
  const Users = factory.defineResourceLayout({ render: () => <p>Ready</p> })
    .createResourceLayout({ resource: 'users', name: 'Users' });
  return { factory, Users };
}

it('reads redefined development defaults from an already-created lazy layout', () => {
  vi.stubEnv('NODE_ENV', 'development');
  const { factory, Users } = fixture();
  factory.defineLazyDefaults({ Loading: () => <p>Old loading</p> });
  const Page = factory.defineResourceLayout.lazy({ resource: 'users', load: () => new Promise<{ Users: typeof Users }>(() => {}) });
  const view = render(<Page />);
  expect(screen.getByText('Old loading')).toBeInTheDocument();
  factory.defineLazyDefaults({ Loading: () => <p>New loading</p> });
  view.rerender(<Page />);
  expect(screen.getByText('New loading')).toBeInTheDocument();
});

it('updates the error default after a failed import and preserves resource overrides', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const { factory, Users } = fixture();
  factory.defineLazyDefaults({ Error: () => <p>Old error</p> });
  const Page = factory.defineResourceLayout.lazy({ resource: 'users', load: async (): Promise<{ Users: typeof Users }> => { throw new ResourceModuleLoadError('users', 'offline'); } });
  const view = render(<Page />);
  expect(await screen.findByText('Old error')).toBeInTheDocument();
  factory.defineLazyDefaults({ Error: () => <p>New error</p> });
  view.rerender(<Page />);
  expect(screen.getByText('New error')).toBeInTheDocument();
  view.unmount();
  const Override = factory.defineResourceLayout.lazy({ resource: 'users', load: () => new Promise<{ Users: typeof Users }>(() => {}), states: { Loading: () => <p>Resource loading</p> } });
  factory.defineLazyDefaults({ Loading: () => <p>Factory loading</p> });
  render(<Override />);
  expect(screen.getByText('Resource loading')).toBeInTheDocument();
});

it('keeps both registration errors in production and rejects a late initial registration in development', () => {
  vi.stubEnv('NODE_ENV', 'production');
  const { factory, Users } = fixture();
  factory.defineLazyDefaults({});
  expect(() => factory.defineLazyDefaults({})).toThrow('only be defined once');
  const late = fixture().factory;
  late.defineResourceLayout.lazy({ resource: 'users', load: async () => ({ Users }) });
  expect(() => late.defineLazyDefaults({})).toThrow('before creating');
  vi.stubEnv('NODE_ENV', 'development');
  expect(() => late.defineLazyDefaults({})).toThrow('before creating');
});
