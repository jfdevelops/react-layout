import type { AnyBaseProp, ExtractPropValue, PropVisibility } from './types';
import { BaseProp } from './base';
import { containsStandardSchema } from './standard-schema';
import { PropError } from './prop-error';
import { InvalidRecordKeyError } from './errors';

export class UnionProp<
  const Members extends readonly AnyBaseProp[],
  Visibility extends PropVisibility,
> extends BaseProp<'union', Visibility, ExtractPropValue<Members[number]>> {
  readonly members: Members;

  constructor(members: Members, visibility: Visibility) {
    super({
      type: 'union',
      visibility,
    });
    this.members = members;
  }

  optional(this: UnionProp<Members, 'required'>) {
    return new UnionProp(this.members, 'optional');
  }

  validate(value: unknown) {
    for (const member of this.members) {
      try {
        const result = member.validate(value);

        return containsStandardSchema(member)
          ? (result as ExtractPropValue<Members[number]>)
          : undefined;
      } catch (error) {
        if (!(error instanceof PropError) && !(error instanceof InvalidRecordKeyError)) {
          throw error;
        }
      }
    }

    throw this.createError(value);
  }

  allows(value: unknown): value is ExtractPropValue<Members[number]> {
    return this.members.some((member) => member.allows(value));
  }
}
