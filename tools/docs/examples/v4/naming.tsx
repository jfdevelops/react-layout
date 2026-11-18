import {
  createDefinedResourceLayout,
  defineLayoutName,
} from '@jfdevelops/react-layout';

const pageName = defineLayoutName({
  pattern: ({ resource, capitalize }, parts) =>
    `${parts.prefix}${capitalize(resource)}${parts.beforeSuffix}ResourceLayout${parts.append}`,
});

const layouts = createDefinedResourceLayout({
  resources: ['users', 'settings'],
  name: pageName(),
});
const definition = layouts.defineResourceLayout({
  render: () => <div />,
});

export const Users = definition.createResourceLayout({
  resource: 'users',
});

export const Settings = definition.createResourceLayout({
  resource: 'settings',
  name: pageName({
    prefix: 'Admin',
    beforeSuffix: 'Detail',
    append: 'Preview',
  }),
});
