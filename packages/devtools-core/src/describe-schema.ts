type Metadata = Record<string, unknown>;

function record(value: unknown): Metadata | undefined {
  return (typeof value === 'object' || typeof value === 'function') &&
    value !== null
    ? (value as Metadata)
    : undefined;
}

export interface SchemaDescription {
  /**
   * The schema's type written as TypeScript, such as `string` or `{ name: string }`.
   * Falls back to `unknown` when the library does not describe its schemas.
   */
  type: string;
  /**
   * The schema library, such as `zod`.
   */
  vendor: string;
  /**
   * Whether the value may be omitted, when the schema says so without being run.
   */
  visibility?: 'required' | 'optional';
}

const maximumDepth = 12;
const schemaTypeName = Symbol.for('@jfdevelops/react-layout/schema-type-name');

/** A name a schema was given for display, looking through optional wrappers. */
function namedType(schema: Metadata, depth = 0): string | undefined {
  const name = (schema as Record<symbol, unknown>)[schemaTypeName];

  if (typeof name === 'string') {
    return name;
  }

  const inner =
    record(record(record(schema._zod)?.def)?.innerType) ??
    record(schema.wrapped);

  return inner && depth < maximumDepth
    ? namedType(inner, depth + 1)
    : undefined;
}

function key(name: string) {
  return /^[a-zA-Z_$][\w$]*$/.test(name) ? name : JSON.stringify(name);
}

function literal(value: unknown): string {
  return typeof value === 'bigint'
    ? `${value}n`
    : (JSON.stringify(value) ?? String(value));
}

function union(parts: ReadonlyArray<string>) {
  return [...new Set(parts)].join(' | ') || 'unknown';
}

/** Writes a JSON Schema as a TypeScript type. */
function fromJsonSchema(schema: unknown, depth = 0): string {
  const node = record(schema);

  if (!node || depth > maximumDepth) {
    return 'unknown';
  }

  if ('const' in node) {
    return literal(node.const);
  }

  if (Array.isArray(node.enum)) {
    return union(node.enum.map(literal));
  }

  for (const combinator of ['anyOf', 'oneOf'] as const) {
    const members = node[combinator];

    if (Array.isArray(members)) {
      return union(members.map((member) => fromJsonSchema(member, depth + 1)));
    }
  }

  if (Array.isArray(node.type)) {
    return union(
      node.type.map((type) =>
        fromJsonSchema(
          {
            ...node,
            type,
          },
          depth + 1,
        ),
      ),
    );
  }

  switch (node.type) {
    case 'string':
    case 'boolean':
    case 'null':
      return node.type;
    case 'number':
    case 'integer':
      return 'number';
    case 'array': {
      const item = fromJsonSchema(node.items, depth + 1);

      return item.includes(' ') ? `(${item})[]` : `${item}[]`;
    }
    case 'object': {
      const properties = record(node.properties);
      const required = new Set(
        Array.isArray(node.required) ? node.required : [],
      );
      const fields = Object.entries(properties ?? {}).map(
        ([name, value]) =>
          `${key(name)}${required.has(name) ? '' : '?'}: ${fromJsonSchema(value, depth + 1)}`,
      );
      const additional = record(node.additionalProperties);

      if (fields.length === 0 && additional) {
        return `Record<string, ${fromJsonSchema(additional, depth + 1)}>`;
      }

      return fields.length > 0 ? `{ ${fields.join('; ')} }` : '{}';
    }
    default:
      return 'unknown';
  }
}

/** Describes a Valibot schema from its public `type`, `entries`, and `expects` fields. */
function fromValibot(schema: Metadata, depth = 0): string {
  if (depth > maximumDepth) {
    return 'unknown';
  }

  const wrapped = record(schema.wrapped);

  if (wrapped) {
    const inner = fromValibot(wrapped, depth + 1);

    return schema.type === 'optional' || schema.type === 'exact_optional'
      ? inner
      : schema.type === 'nullable'
        ? union([inner, 'null'])
        : schema.type === 'nullish'
          ? union([inner, 'null', 'undefined'])
          : inner;
  }

  const entries = record(schema.entries);

  if (entries) {
    const fields = Object.entries(entries).map(([name, value]) => {
      const entry = record(value);
      const optional =
        entry?.type === 'optional' ||
        entry?.type === 'exact_optional' ||
        entry?.type === 'nullish';

      return `${key(name)}${optional ? '?' : ''}: ${entry ? fromValibot(entry, depth + 1) : 'unknown'}`;
    });

    return fields.length > 0 ? `{ ${fields.join('; ')} }` : '{}';
  }

  const item = record(schema.item);

  if (schema.type === 'array' && item) {
    const described = fromValibot(item, depth + 1);

    return described.includes(' ') ? `(${described})[]` : `${described}[]`;
  }

  if (schema.type === 'record') {
    const value = record(schema.value);

    return `Record<string, ${value ? fromValibot(value, depth + 1) : 'unknown'}>`;
  }

  if (Array.isArray(schema.options)) {
    return union(
      schema.options.map((option) => {
        const member = record(option);

        return member && typeof member.type === 'string'
          ? fromValibot(member, depth + 1)
          : literal(option);
      }),
    );
  }

  if (
    schema.type === 'custom' ||
    schema.type === 'unknown' ||
    schema.type === 'any'
  ) {
    return 'unknown';
  }

  if (typeof schema.expects === 'string') {
    return schema.expects.replace(/^\((.*)\)$/, '$1');
  }

  return typeof schema.type === 'string' ? schema.type : 'unknown';
}

/** Whether the schema is an optional wrapper, read from library metadata. */
function optionalWrapper(schema: Metadata): boolean | undefined {
  const zod = record(record(schema._zod)?.def);

  if (zod && typeof zod.type === 'string') {
    return (
      zod.type === 'optional' ||
      zod.type === 'default' ||
      zod.type === 'prefault'
    );
  }

  if (schema.kind === 'schema' && typeof schema.type === 'string') {
    return (
      schema.type === 'optional' ||
      schema.type === 'exact_optional' ||
      schema.type === 'nullish'
    );
  }

  return undefined;
}

/**
 * Describes a Standard Schema as a TypeScript type without validating a value.
 * It reads what the library publishes about the schema: ArkType's expression,
 * Valibot's structure, or a Standard JSON Schema.
 */
export function describeSchema(value: unknown): SchemaDescription | undefined {
  const schema = record(value);
  const standard = record(schema?.['~standard']);

  if (
    !schema ||
    !standard ||
    standard.version !== 1 ||
    typeof standard.validate !== 'function'
  ) {
    return undefined;
  }

  const vendor =
    typeof standard.vendor === 'string' ? standard.vendor : 'unknown';
  let type = 'unknown';
  let visibility: SchemaDescription['visibility'];

  try {
    const optional = optionalWrapper(schema);

    if (optional !== undefined) {
      visibility = optional ? 'optional' : 'required';
    }

    const jsonSchema = record(standard.jsonSchema);
    const named = namedType(schema);

    if (named !== undefined) {
      type = named;
      if (typeof schema.expression === 'string') {
        visibility = 'required';
      }
    } else if (typeof schema.expression === 'string') {
      type = schema.expression;
      visibility = /(^|\| )undefined($| \|)/.test(type)
        ? 'optional'
        : 'required';
    } else if (schema.kind === 'schema' && typeof schema.type === 'string') {
      type = fromValibot(schema);
    } else if (jsonSchema && typeof jsonSchema.input === 'function') {
      type = fromJsonSchema(
        jsonSchema.input({
          target: 'draft-2020-12',
        }),
      );
    }
  } catch {
    // A schema that cannot be described, such as a custom check, stays `unknown`.
  }

  return visibility === undefined
    ? {
        type,
        vendor,
      }
    : {
        type,
        vendor,
        visibility,
      };
}
