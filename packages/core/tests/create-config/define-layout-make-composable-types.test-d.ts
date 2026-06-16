import {
  createProp,
  createComposableComponent,
  defineComposableComponent,
  defineResourceLayout,
} from '../../src';

const createBreadcrumbComposable = defineComposableComponent({
  name: 'Breadcrumbs',
  props: {
    segments: createProp.record({
      value: createProp.string(),
    }),
  },
});

const Breadcrumbs = createBreadcrumbComposable(() => null);

const { createResourceLayout: composableLayout } = defineResourceLayout({
  resources: ['contacts'],
  options: {
    title: createProp.string(),
  },
  layout: {
    composables: () => ({
      Layout: createComposableComponent({
        name: 'Layout',
      }),
      ...Breadcrumbs,
    }),
    props: {
      include: {
        title: true,
        segments: true,
      },
    },
    render: () => null!,
  },
});

const { createResourceLayout: plainLayout } = defineResourceLayout({
  resources: ['contacts'],
  options: {
    title: createProp.string(),
  },
  layout: {
    render: () => null!,
  },
});

const ContactSection = composableLayout.makeComposable({
  resource: 'contacts',
  name: 'ContactSection',
  title: 'Contact',
  segments: {},
});

const _displayName: string = ContactSection.displayName;
const _breadcrumbs = ContactSection.Breadcrumbs;

// @ts-expect-error name and resource are required
composableLayout.makeComposable({
  title: 'Contact',
});

// @ts-expect-error preset props must be provided at layout creation time
composableLayout({
  resource: 'contacts',
  name: 'ContactsPage',
  title: 'Directory',
});

// @ts-expect-error makeComposable is only available when composables are defined
plainLayout.makeComposable({
  resource: 'contacts',
  name: 'ContactsPage',
});

void _displayName;
void _breadcrumbs;
