import { expectTypeOf } from 'vitest';
import { createAccessComposable } from '../src';

const { Access } = createAccessComposable(({ roles, permissions, flag }) => {
  expectTypeOf(roles).toEqualTypeOf<string[] | undefined>();
  expectTypeOf(permissions).toEqualTypeOf<string[] | undefined>();
  expectTypeOf(flag).toEqualTypeOf<string | undefined>();

  return null;
});

<Access />;
<Access roles={['admin']} permissions={['users:read']} flag='beta' />;
// @ts-expect-error Roles are a list of names.
<Access roles='admin' />;
// @ts-expect-error A flag is a single name.
<Access flag={['beta']} />;
