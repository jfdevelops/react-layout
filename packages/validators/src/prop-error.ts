export type PropErrorOptions = {
  layoutName?: string;
  path: string;
  resource?: string;
  received: unknown;
  expected: unknown;
  message: string;
};

type PropMessageOptions = {
  path: string;
  layoutName?: string;
  resource?: string;
};

type MismatchedPropMessageOptions = PropMessageOptions & {
  received: unknown;
  expected: unknown;
};

function createPropLocation({ layoutName, resource }: PropMessageOptions) {
  return layoutName === undefined || resource === undefined
    ? ''
    : ` in layout "${layoutName}" (resource: "${resource}")`;
}

export function createMissingPropMessage(options: PropMessageOptions) {
  return `Missing required prop "${options.path}"${createPropLocation(options)}.`;
}

export function createMismatchedPropMessage(
  options: MismatchedPropMessageOptions,
) {
  return `Invalid prop "${options.path}"${createPropLocation(options)}: expected "${options.expected}", received "${options.received}".`;
}

export class PropError extends Error {
  constructor({
    layoutName,
    path,
    resource,
    received,
    expected,
    message,
  }: PropErrorOptions) {
    super(message);
    this.name = 'PropError';
    this.layoutName = layoutName;
    this.path = path;
    this.resource = resource;
    this.received = received;
    this.expected = expected;
  }

  readonly layoutName: string | undefined;
  readonly path: string;
  readonly resource: string | undefined;
  readonly received: unknown;
  readonly expected: unknown;
}

export function getPropValueType(value: unknown) {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  return typeof value;
}
