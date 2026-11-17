import { createError } from '@jfdevelops/create-error';
import {
  builtIn,
  type StandardSchemaV1,
} from '@jfdevelops/react-layout-validator';

const composableErrorFactory = createError({
  definition: builtIn.object({
    code: builtIn.string,
  }),
  data: {
    property: 'context',
    resolve: ({ input }) => input,
  },
  message: ({ data, implementation }) => implementation(data),
  properties: ({ definition }) => ({
    code: definition.code,
  }),
});

/** Thrown when the composable component map is not an object. */
export class InvalidComponentsError extends composableErrorFactory({
  code: 'invalidComponents',
})
  .defineContext(builtIn.string)
  .implement((message) => message) {}

/** Thrown when no composable components were provided. */
export class EmptyComponentsError extends composableErrorFactory({
  code: 'emptyComponents',
})
  .defineContext(builtIn.string)
  .implement((message) => message) {}

const propRenameContext = builtIn.object({
  composable: builtIn.string,
  prop: builtIn.string,
  name: builtIn.string,
  reason: builtIn.literal('reserved', 'duplicate', 'unknown'),
});

export type InvalidPropRenameContext = StandardSchemaV1.InferOutput<
  typeof propRenameContext
>;

const propRenameReasons = {
  reserved: 'is reserved',
  duplicate: 'is already used by another prop',
  unknown: 'cannot be applied because the prop is not defined',
} satisfies Record<InvalidPropRenameContext['reason'], string>;

/** Thrown when a defined composable's prop cannot take its new name. */
export class InvalidPropRenameError extends composableErrorFactory({
  code: 'invalidPropRename',
})
  .defineContext(propRenameContext)
  .implement(
    ({ composable, prop, name, reason }) =>
      `Composable "${composable}" cannot rename prop "${prop}" to "${name}": the name ${propRenameReasons[reason]}.`,
  ) {}

const presetPropConflictContext = builtIn.object({
  prop: builtIn.string,
  composables: builtIn.tuple(builtIn.string, builtIn.string),
});

export type ConflictingPresetPropContext = StandardSchemaV1.InferOutput<
  typeof presetPropConflictContext
>;

/** Thrown when two preset composables declare one prop with different definitions. */
export class ConflictingPresetPropError extends composableErrorFactory({
  code: 'conflictingPresetProp',
})
  .defineContext(presetPropConflictContext)
  .implement(
    ({ prop, composables: [first, second] }) =>
      `Composables "${first}" and "${second}" both declare prop "${prop}" with different definitions. Rename the prop on one of them, or share one definition.`,
  ) {}
