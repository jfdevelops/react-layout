import { describe, expect, it } from 'vitest';
import {
  type AnyBuiltPropDefinition,
  createProp,
  PropError,
  RenderChildrenProp,
  validateProps,
} from '../src';

type PropErrorCase = {
  name: string;
  createDefinition: () => AnyBuiltPropDefinition;
  invalidValue: unknown;
  received: unknown;
  expected: unknown;
};

function capturePropError(validate: () => unknown) {
  try {
    validate();
  } catch (error) {
    expect(error).toBeInstanceOf(PropError);

    return error as PropError;
  }

  throw new Error('Expected validation to throw a PropError.');
}

function createRenderFunctionProp() {
  const renderProp = new RenderChildrenProp(
    { title: createProp.string() },
    'ReactNode',
    'required',
  );

  return Object.assign(
    (value: unknown) => renderProp.validate(value),
    {
      _baseProp: renderProp,
      visibility: 'required' as const,
    },
  );
}

const propErrorCases: Array<PropErrorCase> = [
  {
    name: 'string',
    createDefinition: () => createProp.string(),
    invalidValue: 42,
    received: 'number',
    expected: 'string',
  },
  {
    name: 'number',
    createDefinition: () => createProp.number(),
    invalidValue: '42',
    received: 'string',
    expected: 'number',
  },
  {
    name: 'boolean',
    createDefinition: () => createProp.boolean(),
    invalidValue: 'true',
    received: 'string',
    expected: 'boolean',
  },
  {
    name: 'object',
    createDefinition: () =>
      createProp.object({ title: createProp.string() }),
    invalidValue: [],
    received: 'array',
    expected: 'object',
  },
  {
    name: 'record',
    createDefinition: () => createProp.record(createProp.string()),
    invalidValue: [],
    received: 'array',
    expected: 'record',
  },
  {
    name: 'JSX element',
    createDefinition: () =>
      createProp.component({ type: 'JSX.Element' }),
    invalidValue: 'content',
    received: 'string',
    expected: 'JSX.Element',
  },
  {
    name: 'ReactNode',
    createDefinition: () => createProp.component({ type: 'ReactNode' }),
    invalidValue: () => null,
    received: 'function',
    expected: 'ReactNode',
  },
  {
    name: 'render function',
    createDefinition: createRenderFunctionProp,
    invalidValue: 'content',
    received: 'string',
    expected: 'function',
  },
  {
    name: 'literal',
    createDefinition: () => createProp.string.literal('contacts'),
    invalidValue: 'users',
    received: 'string',
    expected: 'string',
  },
  {
    name: 'enum',
    createDefinition: () => createProp.number.enum([1, 2, 3]),
    invalidValue: 4,
    received: 'number',
    expected: 'number',
  },
  {
    name: 'union',
    createDefinition: () =>
      createProp.string().or(createProp.number()),
    invalidValue: false,
    received: 'boolean',
    expected: 'union',
  },
];

describe.each(propErrorCases)('$name prop errors', (propCase) => {
  it('reports when the required prop is missing', () => {
    const error = capturePropError(() =>
      validateProps(
        { value: propCase.createDefinition() },
        {},
        { layoutName: 'ContactsPage', resource: 'contacts' },
      ),
    );

    expect(error).toMatchObject({
      name: 'PropError',
      layoutName: 'ContactsPage',
      path: 'value',
      resource: 'contacts',
      received: [],
      expected: ['value'],
      message:
        'Missing required prop "value" in layout "ContactsPage" (resource: "contacts").',
    });
  });

  it('reports when the prop type does not match', () => {
    const error = capturePropError(() =>
      validateProps(
        { value: propCase.createDefinition() },
        { value: propCase.invalidValue },
        { layoutName: 'ContactsPage', resource: 'contacts' },
      ),
    );

    expect(error).toMatchObject({
      name: 'PropError',
      layoutName: 'ContactsPage',
      path: 'value',
      resource: 'contacts',
      received: propCase.received,
      expected: propCase.expected,
      message: `Invalid prop "value" in layout "ContactsPage" (resource: "contacts"): expected "${propCase.expected}", received "${propCase.received}".`,
    });
  });
});

describe('nested object prop errors', () => {
  it('reports when a required nested prop is missing', () => {
    const metadata = createProp.object({ count: createProp.number() });
    const error = capturePropError(() =>
      validateProps(
        { metadata },
        { metadata: {} },
        { layoutName: 'ContactsPage', resource: 'contacts' },
      ),
    );

    expect(error).toMatchObject({
      name: 'PropError',
      layoutName: 'ContactsPage',
      path: 'metadata.count',
      resource: 'contacts',
      received: [],
      expected: ['count'],
      message:
        'Missing required prop "metadata.count" in layout "ContactsPage" (resource: "contacts").',
    });
  });

  it('reports when a nested prop type does not match', () => {
    const metadata = createProp.object({ count: createProp.number() });
    const error = capturePropError(() =>
      validateProps(
        { metadata },
        { metadata: { count: 'three' } },
        { layoutName: 'ContactsPage', resource: 'contacts' },
      ),
    );

    expect(error).toMatchObject({
      name: 'PropError',
      layoutName: 'ContactsPage',
      path: 'metadata.count',
      resource: 'contacts',
      received: 'string',
      expected: 'number',
      message:
        'Invalid prop "metadata.count" in layout "ContactsPage" (resource: "contacts"): expected "number", received "string".',
    });
  });
});
