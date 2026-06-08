import type {
  AnyBuiltPropDefinition,
  ExtractDefinitionValue,
  PropVisibility,
} from './types';
import { BaseProp } from './base';

function assertAllowedRecordKey(
  key: string,
  keyProp: AnyBuiltPropDefinition | undefined,
) {
  if (!keyProp) {
    return;
  }

  try {
    keyProp(key);
  } catch {
    throw new TypeError(`"${key}" is not an allowed record key.`);
  }
}

export class RecordProp<
  ValueProp extends AnyBuiltPropDefinition,
  KeyProp extends AnyBuiltPropDefinition | undefined = undefined,
  Visibility extends PropVisibility = 'required',
> extends BaseProp<
  'record',
  Visibility,
  Record<string, ExtractDefinitionValue<ValueProp>>
> {
  readonly valueProp: ValueProp;
  readonly keyProp: KeyProp;

  constructor(
    valueProp: ValueProp,
    keyProp: KeyProp,
    visibility: Visibility,
  ) {
    super({ type: 'record', visibility });
    this.valueProp = valueProp;
    this.keyProp = keyProp;
  }

  optional(this: RecordProp<ValueProp, KeyProp, 'required'>) {
    return new RecordProp(this.valueProp, this.keyProp, 'optional');
  }

  validate(value: unknown) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw this.error;
    }

    const recordValue = value as Record<string, unknown>;
    const validatedRecord = {} as Record<
      string,
      ExtractDefinitionValue<ValueProp>
    >;

    for (const key of Object.keys(recordValue)) {
      assertAllowedRecordKey(key, this.keyProp);
      this.valueProp(recordValue[key]);
      validatedRecord[key] = recordValue[
        key
      ] as ExtractDefinitionValue<ValueProp>;
    }

    return validatedRecord;
  }

  allows(
    value: unknown,
  ): value is Record<string, ExtractDefinitionValue<ValueProp>> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    const recordValue = value as Record<string, unknown>;

    try {
      for (const key of Object.keys(recordValue)) {
        assertAllowedRecordKey(key, this.keyProp);
        this.valueProp(recordValue[key]);
      }

      return true;
    } catch {
      return false;
    }
  }
}
