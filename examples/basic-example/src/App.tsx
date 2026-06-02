import { ComponentPropsWithRef } from 'react';
import { createProp, defineResourceLayout } from 'view-map';

function Card(props: ComponentPropsWithRef<'section'>) {
  return <section {...props} />;
}

function Title(props: ComponentPropsWithRef<'h2'>) {
  return <h2 {...props} />;
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
    title: createProp.component({ type: 'ReactNode' }),
  },
  layout: {
    composables: (create) => ({
      Layout: create({
        name: ({ resource }) => `${resource}Layout`,
        wrapWith: Card,
      }),
      Title: create({
        name: ({ name }) => `${name}Title`,
        wrapWith: Title,
      }),
    }),
    props: {
      custom: {
        children: createProp.component({ type: 'ReactNode' }),
        className: createProp.string().optional(),
      },
    },
    render: (props, { composables, inProps, resource }) => {
      return (
        <composables.Layout className={props.className}>
          <div className='eyebrow'>resource: {resource}</div>
          <composables.Title>Groups Layout</composables.Title>
          <div className='body'>{props.children}</div>
        </composables.Layout>
      );
    },
  },
});

const GroupsLayout = createResourceLayout({
  resource: 'groups',
  name: 'GroupsLayout',
  title: 'Directory',
});

const GroupPanel = GroupsLayout.makeComposable({ name: 'GroupPanel' });

export function App() {
  return (
    <main className='page'>
      <header className='hero'>
        <p className='kicker'>view-map</p>
        <h1>basic-example</h1>
        <p className='lede'>
          Minimal playground for `defineResourceLayout` and composables.
        </p>
      </header>

      <GroupsLayout className='layout-shell'>
        <GroupPanel>
          <p>
            This example exercises the current layout/composable API from the
            workspace package.
          </p>
        </GroupPanel>
      </GroupsLayout>
    </main>
  );
}
