import { ComponentPropsWithRef } from 'react';
import { defineResourceLayout } from './create-config';
import { createProp } from './create-value';
import { createComposableComponent } from './composable';

function Layout(props: ComponentPropsWithRef<'div'>) {
  return <div {...props} />;
}

const createResourceLayout = defineResourceLayout({
  resources: [
    {
      value: 'users',
      subResources: ['admins', 'managers'],
    },
    'groups',
    'roles',
  ],
  options: {
    title: createProp
      .component({ type: 'ReactNode' })
      .or(
        createProp
          .component({ type: 'JSX.Element' })
          .withChildren({ visibility: 'required' }),
      ),
  },
  layout: {
    composables: {
      Layout: createComposableComponent({
        name: 'Layout',
        wrapWith: Layout,
      }),
    },
    props: {
      custom: {
        includeCreateButton: createProp.boolean().literal(true).optional(),
        addNewIcon: createProp.component({ type: 'ReactNode' }).optional(),
        children: createProp.component({ type: 'ReactNode' }),
        className: createProp.string().optional(),
      },
    },
    render: (props, { composables }) => {
      props.children;
      return <composables.Layout></composables.Layout>;
    },
  },
});
const GroupsLayout = createResourceLayout({
  resource: 'groups',
  name: 'GroupsLayout',
  props: {
    segment: createProp.string(),
  },
  title: () => <></>,
});
const GroupLayout = GroupsLayout.makeComposable({ name: 'GroupLayout' });
