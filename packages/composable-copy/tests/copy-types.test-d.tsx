import { expectTypeOf } from 'vitest';
import { createHeaderComposable, createMetaComposable } from '../src';
import { createCopyComposable } from '../src/contract';

const { Copy } = createCopyComposable(({ title, description }) => {
  expectTypeOf(title).toEqualTypeOf<string>();
  expectTypeOf(description).toEqualTypeOf<string | undefined>();

  return null;
});
const { Header } = createHeaderComposable(({ title, eyebrow }) => {
  expectTypeOf(title).toEqualTypeOf<string>();
  expectTypeOf(eyebrow).toEqualTypeOf<string | undefined>();

  return null;
});
const { Meta } = createMetaComposable(
  ({ title, canonical, image, isIndexable }) => {
    expectTypeOf(title).toEqualTypeOf<string>();
    expectTypeOf(canonical).toEqualTypeOf<string | undefined>();
    expectTypeOf(image).toEqualTypeOf<string | undefined>();
    expectTypeOf(isIndexable).toEqualTypeOf<boolean | undefined>();

    return null;
  },
);

<Copy title='Users' />;
<Header title='Users' eyebrow='Admin' description='Manage users' />;
<Meta title='Users' canonical='/users' isIndexable={false} />;
// @ts-expect-error The title is required.
<Header eyebrow='Admin' />;
// @ts-expect-error The eyebrow belongs to the header.
<Meta title='Users' eyebrow='Admin' />;
// @ts-expect-error The canonical URL is text.
<Meta title='Users' canonical={1} />;
