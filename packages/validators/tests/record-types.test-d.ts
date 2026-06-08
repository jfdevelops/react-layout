import { createProp } from '../src';
import type { ExtractDefinitionValue } from '../src';

const segments = createProp.record({
  value: createProp.string().or(
    createProp.object({
      value: createProp.string(),
      isActive: createProp.boolean.optional()(),
    }),
  ),
});

type SegmentRecord = ExtractDefinitionValue<typeof segments>;
type SegmentValue = SegmentRecord[string];

type ExpectedSegmentValue =
  | string
  | {
      value: string;
      isActive?: boolean | undefined;
    };

type AssertSegmentRecord = SegmentRecord extends Record<
  string,
  ExpectedSegmentValue
>
  ? true
  : SegmentRecord;
type AssertSegmentValue = SegmentValue extends ExpectedSegmentValue
  ? ExpectedSegmentValue extends SegmentValue
    ? true
    : SegmentValue
  : SegmentValue;

const _segmentRecord: AssertSegmentRecord = true;
const _segmentValue: AssertSegmentValue = true;

void segments;
void _segmentRecord;
void _segmentValue;
