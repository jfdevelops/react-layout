import { expectTypeOf } from 'vitest';
import { createRenderState, type Segments } from './base';
import { layoutState } from './layout-state';

export const defaultState = createRenderState({
  state: 'default',
  props: layoutState.Layout.props,
  composables: () => ({ LayoutState: layoutState.asComposable() }),
  render: function DefaultState(props, { composables }) {
    expectTypeOf(props.segments).toEqualTypeOf<Segments | undefined>();
    expectTypeOf(props.showHeader).toEqualTypeOf<boolean | undefined>();
    expectTypeOf(composables.LayoutState).not.toBeAny();
    () => {
      // @ts-expect-error reused state props still require children
      <composables.LayoutState />;
      // @ts-expect-error state composables retain their optional boolean prop type
      <composables.LayoutState showHeader="yes">
        Content
      </composables.LayoutState>;
    };
    return <composables.LayoutState {...props} />;
  },
});
