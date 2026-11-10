import stylistic from '@stylistic/eslint-plugin';

const objectPropertyNewline = stylistic.rules['object-property-newline'];

// Keep this policy on runtime objects; Oxfmt may compact TypeScript type literals.
function createObjectPropertyNewline(context) {
  const listeners = objectPropertyNewline.create(context);

  return {
    ObjectExpression: listeners.ObjectExpression,
  };
}

export default {
  meta: {
    name: 'workspace',
  },
  rules: {
    'object-property-newline': {
      ...objectPropertyNewline,
      create: createObjectPropertyNewline,
    },
  },
};
