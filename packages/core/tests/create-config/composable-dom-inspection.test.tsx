import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createDefinedResourceLayout } from '../../src';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});
it.each(['development', 'production'])(
  'marks only development composable roots in %s',
  (mode) => {
    vi.stubEnv('NODE_ENV', mode);
    const factory = createDefinedResourceLayout({
      resources: ['users'],
      composables: (create) => ({
        Layout: create({ name: 'Layout', wrapWith: 'main' }),
        Header: create({ name: 'Header' }),
      }),
    });
    const Users = factory
      .defineResourceLayout({
        render: (_, { composables }) => (
          <composables.Layout>
            <composables.Header>
              <h1>Users</h1>
            </composables.Header>
          </composables.Layout>
        ),
      })
      .createResourceLayout({ resource: 'users', name: 'Users' });
    const view = render(<Users />);
    expect(view.container.querySelectorAll('[data-rl-composable]').length).toBe(
      mode === 'development' ? 2 : 0,
    );
    expect(view.container.querySelectorAll('main').length).toBe(1);
  },
);
