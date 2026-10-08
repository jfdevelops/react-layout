import { describe, expect, it } from 'vitest';
import { EmptyComponentsError, InvalidComponentsError } from '../src';

describe('composable errors', () => {
  it.each([
    [InvalidComponentsError, 'components must be an object'],
    [EmptyComponentsError, 'components must have at least one component'],
  ])('creates a named %s', (ErrorClass, message) => {
    const error = new ErrorClass(message);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe(ErrorClass.name);
    expect(error.message).toBe(message);
  });
});
