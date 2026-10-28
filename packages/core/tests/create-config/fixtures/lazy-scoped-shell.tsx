import { createDefinedResourceLayout } from '../../../src';

const factory = createDefinedResourceLayout({ resources: ['appointments'] });
const { createResourceLayout } = factory.defineResourceLayout({
  render: () => <section />,
});
const scope = createResourceLayout.forResources('appointments');
const entry = scope.createResourceComponents({
  resource: 'appointments',
  lazy: () => import('./lazy-scoped-content'),
});
const Shell = scope.createComponent({
  resources: { appointments: entry },
  render: (_, ctx) => <ctx.Appointments />,
});
export const Appointments = Shell.asHOF()('appointments');
// Content imports this binding back. A static content import would read it in the TDZ.
export const shellTitle = 'Appointments round-trip';
