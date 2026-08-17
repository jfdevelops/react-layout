import { describe, expect, it } from 'vitest';
import {
  defineResourceLayout,
  InvalidComponentError,
  InvalidResourceError,
  InvalidSubResourceError,
} from '../../src';

describe('getComponent', () => {
  const { createResourceConfig } = defineResourceLayout({
    resources: [
      {
        value: 'users',
        subResources: [
          'admins',
          {
            value: 'managers',
            subResources: [
              {
                value: 'male',
                subResources: [
                  {
                    value: 'wfh',
                    subResources: ['domestic', 'international'],
                  },
                  'onsite',
                ],
              },
              'female',
            ],
          },
        ],
      },
      'groups',
    ],
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
        managers: {
          component: <div>managers</div>,
          female: {
            component: female,
          },
        },
      },
    });

    expect(
      config.getComponent({
        resource: 'users',
        subResource: { value: 'managers', subResource: 'female' },
      }),
    ).toBe(female);
  });

  it('returns a sub-resource component many layers deep', () => {
    const domestic = <div data-testid='domestic'>domestic</div>;
    const config = createResourceConfig({
      users: {
        component: <div>users</div>,
        managers: {
          component: <div>managers</div>,
          male: {
            component: <div>male managers</div>,
            wfh: {
              component: <div>work from home</div>,
              domestic: { component: domestic },
            },
          },
        },
      },
    });

    expect(
      config.getComponent({
        resource: 'users',
        subResource: {
          value: 'managers',
          subResource: {
            value: 'male',
            subResource: {
              value: 'wfh',
              subResource: 'domestic',
            },
          },
        },
      }),
    ).toBe(domestic);
  });

  it('returns a flat sub-resource slug component', () => {
    const admins = <div data-testid='admins'>admins</div>;
    const config = createResourceConfig({
      users: {
        component: <div>users</div>,
        admins: { component: admins },
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

    expect(() => config.getComponent({ resource: 'groups' })).toThrowError(
      InvalidResourceError,
    );
    expect(() => config.getComponent({ resource: 'groups' })).toThrowError(
      /"groups" is not available\. Available resources are users/,
    );
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
    ).toThrowError(InvalidSubResourceError);
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
    ).toThrowError(InvalidComponentError);
    expect(() =>
      config.getComponent({
        resource: 'users',
        component: 'errorComponent',
      }),
    ).toThrowError(/"errorComponent" is not configured/);
  });

  it('forResource returns a reusable getter bound to resource and subResource', () => {
    const root = <div>users</div>;
    const female = <div data-testid='female-bound'>female</div>;
    const config = createResourceConfig({
      users: {
        component: root,
        managers: {
          component: <div>managers</div>,
          female: {
            component: female,
          },
        },
      },
    });

    const getFemale = config.getComponent.forResource({
      resource: 'users',
      subResource: {
        value: 'managers',
        subResource: 'female',
      },
    });

    expect(getFemale()).toBe(female);
    expect(getFemale({ component: 'component' })).toBe(female);
  });

  it('forResource binds only resource when subResource is omitted', () => {
    const root = <div data-testid='users-bound'>users</div>;
    const config = createResourceConfig({
      users: { component: root },
    });

    const getUsers = config.getComponent.forResource({ resource: 'users' });

    expect(getUsers()).toBe(root);
  });

  it('forResource supports alternate component slots on the bound path', () => {
    const main = <div>main</div>;
    const error = <div data-testid='bound-error'>error</div>;
    const config = createResourceConfig({
      users: {
        component: main,
        errorComponent: error,
      },
    });

    const getUsers = config.getComponent.forResource({ resource: 'users' });

    expect(getUsers({ component: 'errorComponent' })).toBe(error);
  });
});

describe('getComponent with a sub-resource on a specific resource', () => {
  const { createResourceConfig } = defineResourceLayout({
    resources: [
      {
        value: 'templates',
        subResources: [
          {
            value: 'deleted',
            subResources: ['expired'],
          },
        ],
      },
      'appointments',
    ],
    layout: {
      render: () => <></>,
    },
  });

  it('returns the default component for the selected sub-resource', () => {
    const deleted = <div data-testid='deleted-templates'>deleted</div>;
    const config = createResourceConfig({
      templates: {
        component: <div>templates</div>,
        detail: { component: <div>templates-detail</div> },
        deleted: { component: deleted },
      },
    });

    expect(
      config.getComponent({
        resource: 'templates',
        subResource: 'deleted',
      }),
    ).toBe(deleted);
  });

  it('keeps component as an optional component-slot selector', () => {
    const deletedError = <div data-testid='deleted-error'>deleted error</div>;
    const config = createResourceConfig({
      templates: {
        component: <div>templates</div>,
        deleted: {
          component: <div>deleted</div>,
          errorComponent: deletedError,
        },
      },
    });

    expect(
      config.getComponent({
        resource: 'templates',
        subResource: 'deleted',
        component: 'errorComponent',
      }),
    ).toBe(deletedError);
  });

  it('resolves nested sub-resources with value and subResource', () => {
    const expired = <div data-testid='expired-templates'>expired</div>;
    const config = createResourceConfig({
      templates: {
        component: <div>templates</div>,
        deleted: {
          component: <div>deleted</div>,
          expired: { component: expired },
        },
      },
    });

    expect(
      config.getComponent({
        resource: 'templates',
        subResource: {
          value: 'deleted',
          subResource: 'expired',
        },
      }),
    ).toBe(expired);
  });

  it('gets a component from a deep config path', () => {
    const expired = <div data-testid='expired'>expired</div>;
    const expiredError = <div data-testid='expired-error'>expired error</div>;
    const config = createResourceConfig({
      templates: {
        component: <div>templates</div>,
        deleted: {
          component: <div>deleted</div>,
          expired: {
            component: expired,
            errorComponent: expiredError,
          },
        },
      },
    });

    expect(config.getComponent('templates.deleted.expired')).toBe(expired);
    expect(
      config.getComponent('templates.deleted.expired.errorComponent'),
    ).toBe(expiredError);
  });
});
