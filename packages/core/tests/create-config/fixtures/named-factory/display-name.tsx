import { defineResourceLayout } from '@jfdevelops/react-layout';

const config = defineResourceLayout({
  resources: [
    {
      value: 'users',
      subResources: ['profile'],
    },
  ],
  layout: {
    render: () => <main />,
  },
}).createResourceConfig({
  users: {
    component: <div />,
    profile: {
      component: <div />,
    },
  },
});

export const renderUser = config.createRenderer({
  render: () => null,
  displayName: {
    users: ({ path }) => {
      if (path.is('users.profile')) {
        const segment: 'profile' = path.segments.profile.value;
        const name: 'ProfilePage' = path.create(
          path.segments.profile.capitalize(),
          'Page',
        );

        return path.create(segment, name);
      }

      return path.create(path.segments.users.capitalize(), 'Page');
    },
    'users.profile': ({ path }) => {
      const name: 'UsersProfilePage' = path.create(
        path.segments.users.capitalize(),
        path.segments.profile.capitalize(),
        'Page',
      );
      // @ts-expect-error Unknown segments are rejected.
      void path.segments.missing;

      return name;
    },
    '*': ({ path }) => path.create(path.capitalize(), 'Fallback'),
  },
});

config.createRenderer({
  render: () => null,
  displayName: {
    // @ts-expect-error Unknown mapping paths are rejected.
    missing: 'Missing',
  },
});

export const renderCallback = config.createRenderer({
  render: () => null,
  displayName: ({ path }) => {
    if (path.is('users.profile')) {
      const joined: 'UsersProfile' = path.capitalize({
        join: {
          removeDelimiter: true,
          capitalizeSegments: true,
        },
      });
      const custom: 'ProfileUsersPage' = path.capitalize({
        join: ({ segments, create }) =>
          create(
            segments.profile.capitalize(),
            segments.users.capitalize(),
            'Page',
          ),
      });
      const fromValues: 'UsersProfile' = path.capitalize({
        join: ({ segments, capitalize, create }) =>
          create(
            capitalize(segments.users.value),
            capitalize(segments.profile.value),
          ),
      });

      return path.create(joined, custom, fromValues);
    }

    return path.capitalize();
  },
});
