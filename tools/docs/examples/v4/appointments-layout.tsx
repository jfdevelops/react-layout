import { createDefinedResourceLayout } from '@jfdevelops/react-layout';

const { defineResourceLayout } = createDefinedResourceLayout({
  resources: ['appointments', 'availability'],
});

export const appointmentsLayout = defineResourceLayout({
  render: () => <p>Appointments</p>,
}).createResourceLayout({
  resource: 'appointments',
  name: 'Appointments',
});
