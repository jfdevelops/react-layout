import type { ReactNode } from 'react';
import { expectTypeOf } from 'vitest';
import { createProp } from '@jfdevelops/react-layout';
import { createRenderState, type Resource, type Segments } from './base';

export const layoutState = createRenderState({
  state: 'Layout',
  props: {
    include: { title: true, description: 'optional', segments: 'optional' },
    custom: {
      children: createProp.component({ type: 'ReactNode' }),
      actions: createProp.component({ type: 'ReactNode' }).optional(),
      showHeader: createProp.boolean().optional(),
    },
  },
  render: function Layout(
    { title, description, segments = {}, children, actions, showHeader = true },
    { composables, resources }
  ) {
    expectTypeOf(title).toEqualTypeOf<ReactNode>();
    expectTypeOf(description).toEqualTypeOf<ReactNode>();
    expectTypeOf(segments).toEqualTypeOf<Segments>();
    expectTypeOf(children).toEqualTypeOf<ReactNode>();
    expectTypeOf(actions).toEqualTypeOf<ReactNode>();
    expectTypeOf(showHeader).toEqualTypeOf<boolean>();
    expectTypeOf(resources.current).toEqualTypeOf<Resource>();
    expectTypeOf(composables).not.toBeAny();
    expectTypeOf(composables.Layout.displayName).toEqualTypeOf<
      'AppointmentsLayout' | 'DashboardLayout' | 'BuilderLayout'
    >();
    expectTypeOf(composables.Breadcrumb).toBeCallableWith({
      segments: { page: 'Appointments' },
    });
    () => {
      // @ts-expect-error undeclared composables must not become any
      composables.Missing;
      // @ts-expect-error local wrapper props must not become any beside a preset
      <composables.Header className={123} />;
      // @ts-expect-error segment values must retain the packaged preset's schema
      <composables.Breadcrumb segments={{ page: 123 }} />;
    };
    return (
      <composables.Layout>
        {showHeader && (
          <composables.Header className="admin-header">
            <h1>{title}</h1>
            {description}
            <composables.Breadcrumb segments={segments} />
            {actions}
          </composables.Header>
        )}
        {children}
      </composables.Layout>
    );
  },
});
