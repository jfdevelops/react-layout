import {
  componentSlotSymbol,
  type ComponentSlotBrand,
  type PropDefinitions,
  type ResolveProps,
  type StandardSchemaV1,
} from '@jfdevelops/react-layout-validator';
import { type } from 'arktype';
import type { JSX } from 'react';

/** The component a slot holds, receiving the props the slot declares. */
export type ComponentSlotComponent<Shape extends PropDefinitions = {}> = [
  keyof Shape,
] extends [never]
  ? () => JSX.Element
  : (props: ResolveProps<Shape>) => JSX.Element;

/**
 * A prop that holds a component rather than a value. Declared as `actions`, it
 * is supplied and rendered as `Actions`, so a layout can write
 * `<props.Actions />`.
 */
export interface ComponentSlotDefinition<
  Shape extends PropDefinitions = {},
  Optional extends boolean = false,
>
  extends
    StandardSchemaV1<
      | ComponentSlotComponent<Shape>
      | (Optional extends true ? undefined : never),
      | ComponentSlotComponent<Shape>
      | (Optional extends true ? undefined : never)
    >,
    ComponentSlotBrand<Shape> {}

export interface ComponentSlotOptions<
  Shape extends PropDefinitions,
  Optional extends boolean,
> {
  /**
   * The props the slot's component accepts.
   */
  props?: Shape;
  /**
   * Allow the slot to be omitted. Defaults to false.
   */
  optional?: Optional;
}

const componentSchema = type('Function') as unknown as StandardSchemaV1<
  unknown,
  unknown
>;

/**
 * Declares a component slot. Use it for a prop whose value is a component the
 * layout renders, optionally describing the props that component receives.
 *
 * @example
 * ```tsx
 * options: {
 *   actions: componentSlot({ props: { label: z.string() } }),
 * },
 * render: (props) => <props.Actions label='Create' />,
 * ```
 */
export function componentSlot<
  const Shape extends PropDefinitions = {},
  const Optional extends boolean = false,
>(
  options: ComponentSlotOptions<Shape, Optional> = {},
): ComponentSlotDefinition<Shape, Optional> {
  const standard = componentSchema['~standard'];

  return {
    '~standard': {
      version: 1,
      vendor: standard.vendor,
      validate: (value: unknown) =>
        options.optional && value === undefined
          ? {
              value: undefined,
            }
          : standard.validate(value),
    },
    [componentSlotSymbol]: (options.props ?? {}) as Shape,
    [Symbol.for('@jfdevelops/react-layout/schema-type-name')]: 'Component',
  } as ComponentSlotDefinition<Shape, Optional>;
}
