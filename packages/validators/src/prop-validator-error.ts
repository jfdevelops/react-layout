import { string } from './built-in';
import { validatorErrorFactory } from './errors';

/**
 * The error a custom prop validator throws to reject a value. A validator
 * receives it as `error`: `throw error('Expected text')`.
 */
export class PropValidatorError extends validatorErrorFactory({
  code: 'invalidPropValue',
})
  .defineContext(string)
  .implement((message) => message) {}
