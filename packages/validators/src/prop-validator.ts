import { PropValidatorError } from './prop-validator-error';
import { createSchema, fail, pass, type PropValidatorSchema } from './schema';
import { isStandardSchema } from './standard-schema';
import type { PropDefinition } from './types';

/**
 * Creates the error a custom prop validator throws:
 * `throw error('Expected text')`. It takes what the error class takes.
 */
export type PropValidatorErrorHelper = (
  ...input: ConstructorParameters<typeof PropValidatorError>
) => PropValidatorError;

/** What a custom prop validator receives. */
export type PropValidatorContext = {
  /**
   * The supplied value, to be narrowed before it is returned.
   */
  value: unknown;
  /**
   * Creates the error that rejects a value: `throw error('Expected text')`.
   */
  error: PropValidatorErrorHelper;
};

/**
 * A custom prop validator. It receives the supplied `value` as `unknown` and
 * the `error` helper, returns the validated value, and throws to reject it.
 */
export type PropValidator<Value = unknown> = (
  context: PropValidatorContext,
) => Value;

/** Prop definitions as written: schemas, inline validators, or both. */
export type PropDefinitionInputs = Record<
  string,
  PropDefinition | PropValidator
>;

/** The prop definitions that inline validators and schemas resolve to. */
export type NormalizePropDefinitions<Inputs> = {
  [Key in keyof Inputs]: Inputs[Key] extends PropDefinition
    ? Inputs[Key]
    : Inputs[Key] extends (...args: never[]) => infer Value
      ? PropValidatorSchema<Value>
      : never;
};

const defaultMessage = 'Value did not pass validation';

const createValidatorError: PropValidatorErrorHelper = (...input) =>
  new PropValidatorError(...input);

/**
 * Creates a reusable prop definition from a validator function, with no
 * schema library. The validator narrows the `unknown` value it receives, and
 * its return type is the prop's type. An error it throws rejects the value:
 * its message describes why, and it is the `cause` of the resulting
 * `PropError`.
 */
export function createPropValidator<Value>(
  validate: PropValidator<Value>,
): PropValidatorSchema<Value> {
  return createSchema((value) => {
    try {
      return pass(
        validate({
          value,
          error: createValidatorError,
        }),
      );
    } catch (error) {
      return fail(
        error instanceof Error && error.message
          ? error.message
          : defaultMessage,
        error,
      );
    }
  });
}

/** Turns inline validators into prop definitions and keeps schemas as given. */
export function normalizePropDefinitions<Inputs extends PropDefinitionInputs>(
  inputs: Inputs,
) {
  return Object.fromEntries(
    Object.entries(inputs).map(([key, definition]) => [
      key,
      !isStandardSchema(definition) && typeof definition === 'function'
        ? createPropValidator(definition)
        : definition,
    ]),
  ) as NormalizePropDefinitions<Inputs>;
}
