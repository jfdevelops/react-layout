import { describe, expect, it } from 'vitest';
import { defineResourceLayout } from '../../src';

describe('getComponent', () => {
  const { createResourceConfig } = defineResourceLayout({
    resources: [
      {
        value: 'users',
        subResources: [
          'admins',
          {
            value: 'managers',
            subResources: ['male', 'female'],
          },
        ],
      },
      'groups',
    ],
    options: {},
    layout: {
      render: () => <></>,
    },
  });

  it('returns the root component for a resource', () => {
    const root = <div data-testid='users-root'>users</div>;
    const config = createResourceConfig({
      users: { component: root },
    });

    expect(config.getComponent({ resource: 'users' })).toBe(root);
  });

  it('returns a nested sub-resource component', () => {
    const root = <div>users</div>;
    const female = <div data-testid='female'>female</div>;
    const config = createResourceConfig({
      users: {
        component: root,
        subResources: {
          managers: {
            component: <div>managers</div>,
            subResources: {
              female: { component: female },
            },
          },
        },
      },
    });

    expect(
      config.getComponent({
        resource: 'users',
        subResource: { resource: 'managers', subResource: 'female' },
      }),
    ).toBe(female);
  });

  it('returns a flat sub-resource slug component', () => {
    const admins = <div data-testid='admins'>admins</div>;
    const config = createResourceConfig({
      users: {
        component: <div>users</div>,
        subResources: {
          admins: { component: admins },
        },
      },
    });

    expect(
      config.getComponent({
        resource: 'users',
        subResource: 'admins',
      }),
    ).toBe(admins);
  });

  it('returns an alternate component slot when specified', () => {
    const main = <div>main</div>;
    const error = <div data-testid='error'>error</div>;
    const config = createResourceConfig({
      users: {
        component: main,
        errorComponent: error,
      },
    });

    expect(
      config.getComponent({
        resource: 'users',
        component: 'errorComponent',
      }),
    ).toBe(error);
  });

  it('returns the default component for a new/detail branch', () => {
    const created = <div data-testid='new'>new</div>;
    const config = createResourceConfig({
      groups: {
        component: <div>list</div>,
        new: { component: created },
      },
    });

    expect(
      config.getComponent({
        resource: 'groups',
        component: 'new',
      }),
    ).toBe(created);
  });

  it('throws when the resource is not configured', () => {
    const config = createResourceConfig({
      users: { component: <div>users</div> },
    });

    expect(() =>
      config.getComponent({ resource: 'groups' }),
    ).toThrowError('Resource "groups" is not configured');
  });

  it('throws when the sub-resource path is not configured', () => {
    const config = createResourceConfig({
      users: { component: <div>users</div> },
    });

    expect(() =>
      config.getComponent({
        resource: 'users',
        subResource: 'admins',
      }),
    ).toThrowError('Sub-resource "admins" is not configured');
  });

  it('throws when the requested component slot is missing', () => {
    const config = createResourceConfig({
      users: { component: <div>users</div> },
    });

    expect(() =>
      config.getComponent({
        resource: 'users',
        component: 'errorComponent',
      }),
    ).toThrowError('Missing "errorComponent" configuration');
  });
});
