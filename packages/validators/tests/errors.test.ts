import { describe, expect, it } from 'vitest';
import { InvalidRecordKeyError, InvalidWrapperError } from '../src';

describe('validator errors', () => {
  it.each([
    [InvalidWrapperError, 'Invalid wrapper'],
    [InvalidRecordKeyError, 'Invalid record key'],
  ])('creates a named %s', (ErrorClass, message) => {
    const error = new ErrorClass(message);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe(ErrorClass.name);
    expect(error.message).toBe(message);
  });
});
