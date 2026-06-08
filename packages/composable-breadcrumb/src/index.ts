import { createProp } from '@jfdevelops/react-layout-validator';
import { defineComposableComponent } from '@jfdevelops/react-layout-composables';

export const createBreadcrumbComposable = defineComposableComponent({
  name: 'Breadcrumb',
  props: {
    segments: createProp.record({
      value: createProp.string().or(
        createProp.object({
          value: createProp.string(),
          isActive: createProp.boolean().optional(),
        }),
      ),
    }),
  },
});
