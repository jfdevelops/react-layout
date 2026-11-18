import { createDefinedResourceLayout } from '@jfdevelops/react-layout';

const { defineLazyDefaults, defineResourceLayout } =
  createDefinedResourceLayout({
    resources: ['appointments', 'availability'],
  });

defineLazyDefaults({
  Loading: ({ resource }) => <p>Loading {resource}…</p>,
  Error: ({ error, retry }) => (
    <div role='alert'>
      <p>{error.message}</p>
      <button onClick={retry}>Retry</button>
    </div>
  ),
});

export const Appointments = defineResourceLayout.lazy({
  resource: 'appointments',
  load: () => import('./appointments-layout'),
  fallback: <p>Downloading appointments…</p>,
});

export function preloadAppointments() {
  return Appointments.preload();
}
