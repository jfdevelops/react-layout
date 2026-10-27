import { createProp } from '@jfdevelops/react-layout';
import { createRenderState, defineResourceLayout } from './base';
import { defaultState } from './default-state';
import { layoutState } from './layout-state';

const errorState = createRenderState({
  state: 'Error',
  props: { include: { title: true }, custom: { error: createProp.string() } },
  render: ({ title, error }) => (
    <p>
      {title}: {error}
    </p>
  ),
});

export const {
  createResourceLayout,
  createResourceConfig,
  createResourceLinks,
  useResource,
  ResourceProvider,
} = defineResourceLayout({
  render: { ...layoutState, ...defaultState, ...errorState },
});
