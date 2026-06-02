import type { AnyBaseProp, ExtractPropValue, PropVisibility } from './types';
import { BaseProp } from './base';

export class UnionProp<
  const Members extends readonly AnyBaseProp[],
  Visibility extends PropVisibility,
> extends BaseProp<'union', Visibility, ExtractPropValue<Members[number]>> {
  readonly members: Members;

  constructor(members: Members, visibility: Visibility) {
    super({ type: 'union', visibility });
    this.members = members;
  }

  optional(this: UnionProp<Members, 'required'>) {
    return new UnionProp(this.members, 'optional');
  }

  validate(value: unknown) {
    for (const member of this.members) {
      if (member.allows(value)) return;
    }

    throw this.error;
  }

  allows(value: unknown): value is ExtractPropValue<Members[number]> {
    return this.members.some((member) => member.allows(value));
  }
}
