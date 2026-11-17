import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createAccessComposable } from '../src';
import { createAccessComposable as contract } from '../src/contract';

describe('access contract', () => {
  const granted = new Set(['users:read']);
  const { Access } = createAccessComposable(
    ({ roles, permissions, flag, children }) => {
      const isAllowed =
        (permissions ?? []).every((permission) => granted.has(permission)) &&
        (roles ?? []).length === 0 &&
        flag === undefined;

      return isAllowed ? children : <p>Not allowed</p>;
    },
  );

  it('is the preset exported by the package', () => {
    expect(createAccessComposable).toBe(contract);
  });

  it('passes the page requirements and content to the render callback', () => {
    const view = render(
      <Access permissions={['users:read']}>
        <p>Users</p>
      </Access>,
    );

    expect(screen.getByText('Users')).toBeInTheDocument();
    view.rerender(
      <Access permissions={['users:write']} roles={['admin']} flag='beta'>
        <p>Users</p>
      </Access>,
    );
    expect(screen.getByText('Not allowed')).toBeInTheDocument();
  });

  it('requires nothing by default', () => {
    render(
      <Access>
        <p>Open page</p>
      </Access>,
    );
    expect(screen.getByText('Open page')).toBeInTheDocument();
  });

  it('rejects requirements that are not names', () => {
    expect(() =>
      render(
        createElement(Access, {
          roles: 'admin',
        } as never),
      ),
    ).toThrow(/Invalid prop "roles/);
  });
});
