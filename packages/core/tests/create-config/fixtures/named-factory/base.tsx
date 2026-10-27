import type { ReactNode } from 'react';
import { expectTypeOf } from 'vitest';
import { createBreadcrumbComposable } from '@jfdevelops/react-layout-composable-breadcrumb';
import {
  createDefinedResourceLayout,
  createProp,
} from '@jfdevelops/react-layout';

export type Resource = 'appointments' | 'dashboard' | 'builder';

function AdminLayout({ children }: { children?: ReactNode }) {
  return <main>{children}</main>;
}
function AdminHeader({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return <header className={className}>{children}</header>;
}

export const breadcrumbComposable = createBreadcrumbComposable(
  ({ segments }) => (
    <nav>
      {Object.entries(segments).map(([key, segment]) => (
        <span key={key}>
          {typeof segment === 'string' ? segment : segment.value}
        </span>
      ))}
    </nav>
  )
);

export type Segments = Parameters<
  typeof breadcrumbComposable.Breadcrumb
>[0]['segments'];
expectTypeOf<Segments>().toMatchTypeOf<
  Record<string, string | { value: string; isActive?: boolean }>
>();

export const {
  defineResourceLayout,
  createRenderState,
  defineLazyDefaults,
  resources,
} = createDefinedResourceLayout({
  resources: [
    'appointments',
    'dashboard',
    { value: 'builder', subResources: ['homepage'] },
  ],
  options: {
    title: createProp.component({ type: 'ReactNode' }),
    description: createProp.component({ type: 'ReactNode' }).optional(),
  },
  composables: (create) => ({
    Layout: create({
      name: ({ resource, capitalize }) => `${capitalize(resource)}Layout`,
      wrapWith: AdminLayout,
    }),
    ...breadcrumbComposable,
    Header: create({
      name: ({ resource, capitalize }) => `${capitalize(resource)}Header`,
      wrapWith: AdminHeader,
    }),
  }),
  props: {
    include: { segments: { required: false, suppliedVia: 'component' } },
  },
  name: ({ resource, capitalize, states }) => {
    expectTypeOf(resource).toEqualTypeOf<Resource>();
    expectTypeOf(capitalize('appointments')).toEqualTypeOf<'Appointments'>();
    expectTypeOf(states).toEqualTypeOf<readonly string[]>();
    return `${capitalize(resource)}Layout`;
  },
});
