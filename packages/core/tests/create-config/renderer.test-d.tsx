import { z } from 'zod';
import { expectTypeOf } from 'vitest';

import { pages } from './fixtures/renderer';

const renderPage = pages.createRenderer({
  factory: {
    render:
      (_props, { context: { Component, componentKey } }) =>
      () => <Component componentKey={componentKey} />,
  },
  params: {
    include: {
      keys: true,
    },
  },
  render: () => null,
});

const renderTrash = renderPage('trash');
const Trash = renderTrash({
  component: 'pendingComponent',
});
expectTypeOf(Trash).toEqualTypeOf<() => React.JSX.Element>();
expectTypeOf(Trash).not.toHaveProperty('forResource');
renderTrash({
  // @ts-expect-error Components accept only component keys or '*'.
  component: {
    componentKey: 'component',
  },
});
renderTrash({
  component: 'component',
  // @ts-expect-error The component key belongs in component, not params.
  params: {
    componentKey: 'component',
  },
});
renderTrash({
  // @ts-expect-error This key belongs to the container page.
  component: 'errorComponent',
});
// @ts-expect-error Unknown resource path.
renderPage('unknown');
const containers = renderPage.forPath('containers');
// @ts-expect-error Invalid remaining path.
containers('unknown');
const custom = pages.createRenderer({
  params: {
    include: {
      keys: true,
    },
    custom: {
      count: z.string().transform(Number),
    },
  },
  render: () => null,
  factory: {
    props: {
      label: z.string(),
    },
    render: (props, { context }) => ({
      label: props.label,
      count: context.count,
    }),
  },
});

const customTrash = custom('trash');
// @ts-expect-error Custom parameters must be supplied under params.
customTrash({
  component: 'component',
  props: {
    label: 'Count',
  },
});
// @ts-expect-error Factory props are required here.
customTrash({
  component: 'component',
  params: {
    count: '1',
  },
});
customTrash({
  component: 'component',
  params: {
    // @ts-expect-error Callers provide schema input, not transformed output.
    count: 1,
  },
  props: {
    label: 'Count',
  },
});
const variables = pages.createRenderer({
  params: {
    include: {
      path: true,
      keys: true,
    },
  },
  render: () => null,
  factory: {
    render: (_props, { context }) => context.resource,
  },
});
const renderVariable = variables('$resource');
renderVariable({
  component: 'component',
  params: {
    resource: 'trash',
  },
});
renderVariable({
  component: 'component',
  params: {
    // @ts-expect-error Invalid resource value.
    resource: 'missing',
  },
});
// @ts-expect-error Required path parameters must be supplied.
renderVariable({
  component: 'component',
});
const conflictingParams = {
  include: {
    keys: true as const,
  },
  custom: {
    componentKey: z.string(),
  },
};
// @ts-expect-error Included and custom parameters cannot collide.
pages.forPaths('trash').addParams(conflictingParams);

const withoutFactory = pages.createRenderer({
  render: () => null,
});
withoutFactory('trash').render(() => null);
const undefinedFactory = pages.createRenderer({
  render: () => null,
  factory: undefined,
});
undefinedFactory('trash').render(() => null);
const componentFactory = pages.createRenderer({
  render: () => null,
  factory: {
    render: (_props, { context }) => context.Component,
  },
});
const createTrashComponent = componentFactory('trash');
const TrashComponent = createTrashComponent();
TrashComponent.render(() => null);

const createOptionalFactory = pages.createRenderer({
  render: () => null,
  factory:
    Math.random() > 0.5
      ? {
          render: () => 42 as const,
        }
      : undefined,
});
const optionalFactory = createOptionalFactory('trash');

if ('render' in optionalFactory) {
  optionalFactory.render(() => null);
} else {
  expectTypeOf(optionalFactory()).toEqualTypeOf<42>();
}

const misspelledPick = {
  include: {
    path: {
      pick: {
        resource: true as const,
        missing: true as const,
      },
    },
  },
};
pages.createRenderer({
  // @ts-expect-error Only available path variable names may be picked.
  params: misspelledPick,
  render: () => null,
});
// @ts-expect-error Unknown keys cannot be picked even alongside valid variables.
pages.forPaths('$resource.$subResource').addParams(misspelledPick);
const wrongScopedPick = {
  include: {
    path: {
      pick: {
        resource: true as const,
      },
    },
  },
};
// @ts-expect-error The resource is fixed here; only subResource is a path parameter.
pages.forPaths('containers.$subResource').addParams(wrongScopedPick);
const OptionalResource = pages
  .forPaths('$resource.$subResource')
  .addParams({
    include: {
      path: {
        optional: true,
        pick: {
          resource: true,
        },
      },
    },
  })
  .render(({ params }) => {
    expectTypeOf(params.resource).toEqualTypeOf<'containers' | undefined>();
    expectTypeOf(params).not.toHaveProperty('subResource');

    return <main />;
  });
<OptionalResource />;
<OptionalResource resource='containers' />;
// @ts-expect-error The unselected variable is not a component prop.
<OptionalResource subResource='$containerId' />;

const nestedSelection = pages.createRenderer({
  params: {
    include: {
      path: {
        pick: {
          resource: {
            containers: {
              $containerId: true,
            },
          },
        },
      },
    },
  },
  render: ({ path, params }) => {
    expectTypeOf(path).toEqualTypeOf<
      | 'containers.$containerId'
      | '$resource.$containerId'
      | 'containers.$subResource'
      | '$resource.$subResource'
    >();
    expectTypeOf(params.resource).toEqualTypeOf<'containers'>();

    return null;
  },
});
nestedSelection('containers.$containerId');
// @ts-expect-error The selection excludes the trash resource.
nestedSelection('trash');
const invalidNestedPick = {
  include: {
    path: {
      pick: {
        resource: {
          containers: {
            missing: true as const,
          },
        },
      },
    },
  },
};
pages.createRenderer({
  // @ts-expect-error Nested keys must be configured branches.
  params: invalidNestedPick,
  render: () => null,
});
const invalidLeafPick = {
  include: {
    path: {
      pick: {
        resource: {
          trash: {
            missing: true as const,
          },
        },
      },
    },
  },
};
pages.createRenderer({
  // @ts-expect-error Leaf resources accept true rather than a nested object.
  params: invalidLeafPick,
  render: () => null,
});
const selectedResource = pages.createRenderer({
  params: {
    include: {
      path: {
        optional: true,
        pick: {
          resource: {
            trash: true,
          },
        },
      },
    },
  },
  render: ({ path, params }) => {
    expectTypeOf(path).toEqualTypeOf<'trash' | '$resource'>();
    expectTypeOf(params.resource).toEqualTypeOf<'trash' | undefined>();

    return null;
  },
});
selectedResource('$resource');
// @ts-expect-error The resource selection excludes containers.
selectedResource('containers');
