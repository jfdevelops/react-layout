import { createRenderState, defineResourceLayout } from './base';
import { defaultState } from './default-state';
import { layoutState } from './layout-state';
import { z } from 'zod';

const errorState = createRenderState({
  state: 'Error',
  props: {
    include: {
      title: true,
    },
    custom: {
      error: z.string(),
    },
  },
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
  render: {
    ...layoutState,
    ...defaultState,
    ...errorState,
  },
});
