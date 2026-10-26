import { useState } from 'react';
import {
  inspectPropValidator,
  mapInspectionDetails,
} from '@jfdevelops/react-layout-devtools-core';
import type { ChipPalette, DevtoolsChipKind } from './config';
import { Badge } from './components/ui/badge';
import { HelpTooltip } from './components/ui/tooltip';
import { Input } from './components/ui/input';
import { control } from './theme';

type Bag = Record<string, unknown>;
const bag = (value: unknown): Bag =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Bag)
    : {};
const explanations = {
  included:
    'Included props reuse existing option or composable prop definitions. Their settings control whether values are required and where they can be supplied.',
  custom:
    'Custom props declare additional validator-backed inputs for the rendered layout or state.',
  required: 'Required: a value must be supplied at the configured location.',
  optional: 'Optional: the value may be omitted.',
  config:
    "Config: supply this value when calling createResourceLayout. Set passthrough: 'config'; true is shorthand for required config input.",
  component:
    "Component: supply this value on the rendered layout component using passthrough: 'component'. Optional inputs accept values in either location; 'optional' is shorthand for this flexible behavior.",
};
interface PropRow {
  name: string;
  kind: 'included' | 'custom';
  visibility?: 'required' | 'optional';
  type?: string;
  locations: ('component' | 'config')[];
}
function propsFor(details: Bag): PropRow[] {
  const props = bag(details.props);
  const schemas = bag(details.propSchemas);
  return [
    ...Object.entries(bag(props.include)).map(([name, behavior]): PropRow => {
      const settings = bag(behavior);
      const visibility =
        behavior === 'optional' || settings.visibility === 'optional'
          ? 'optional'
          : 'required';
      const location =
        settings.passthrough === 'component' ? 'component' : 'config';
      return {
        name,
        kind: 'included',
        visibility,
        type: inspectPropValidator(schemas[name])?.type,
        locations:
          visibility === 'optional' ? ['config', 'component'] : [location],
      };
    }),
    ...Object.entries(bag(props.custom)).map(([name, validator]): PropRow => {
      const description = inspectPropValidator(validator);
      return {
        name,
        kind: 'custom',
        visibility: description?.visibility,
        type: description?.type,
        locations: [],
      };
    }),
  ];
}
export function InspectionDetails({
  details,
  palette,
}: {
  details: object;
  palette: ChipPalette;
}) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [visibility, setVisibility] = useState('all');
  const info = bag(details);
  const rows = propsFor(info);
  const filtered = rows.filter(
    (row) =>
      (kind === 'all' || row.kind === kind) &&
      (visibility === 'all' || row.visibility === visibility) &&
      `${row.name} ${row.type ?? ''}`
        .toLowerCase()
        .includes(query.toLowerCase())
  );
  function chip(label: string, color: DevtoolsChipKind, help: string) {
    return (
      <HelpTooltip key={`${color}-${label}`} content={help}>
        <Badge tabIndex={0} style={palette[color]}>
          {label}
        </Badge>
      </HelpTooltip>
    );
  }
  const other = Object.fromEntries(
    Object.entries(info).filter(
      ([key]) => key !== 'props' && key !== 'propSchemas' && key !== 'path'
    )
  );
  const safe = bag(mapInspectionDetails(other, (prop) => prop.type));
  function valueText(value: unknown): string {
    if (value == null) return 'Not specified';
    if (Array.isArray(value)) return value.map(valueText).join(', ') || 'None';
    if (typeof value === 'object')
      return (
        Object.entries(value)
          .map(([key, child]) => `${key}: ${valueText(child)}`)
          .join(' · ') || 'None'
      );
    return String(value);
  }
  return (
    <>
      {Object.keys(safe).length > 0 && (
        <dl
          style={{
            fontSize: 12,
            margin: 0,
            padding: 12,
            borderRadius: 8,
            background: '#101a2b',
            display: 'grid',
            gridTemplateColumns: 'auto minmax(0, 1fr)',
            gap: '8px 12px',
            overflowWrap: 'anywhere',
          }}
        >
          {Object.entries(safe).map(([key, value]) => (
            <div key={key} style={{ display: 'contents' }}>
              <dt style={{ color: '#94a3b8', textTransform: 'capitalize' }}>
                {key.replace(/([A-Z])/g, ' $1')}
              </dt>
              <dd style={{ margin: 0 }}>{valueText(value)}</dd>
            </div>
          ))}
        </dl>
      )}
      {'props' in info && (
        <section
          aria-label="Props"
          style={{ borderTop: '1px solid #243044', paddingTop: 16 }}
        >
          <h4
            style={{
              margin: '0 0 8px',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            Props{' '}
            <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 400 }}>
              {rows.length}
            </span>
          </h4>
          <p
            style={{
              fontSize: 12,
              lineHeight: 1.6,
              color: '#94a3b8',
              margin: '0 0 12px',
            }}
          >
            Included props reuse existing options or composable props. Custom
            props define additional inputs. Hover or focus a chip to learn what
            its setting means.
          </p>
          {rows.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'nowrap',
                gap: 8,
                marginBottom: 14,
              }}
            >
              <Input
                aria-label="Filter props"
                placeholder="Find a prop or type…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                style={{ flex: '1 1 0', minWidth: 0, fontSize: 12 }}
              />
              <select
                aria-label="Filter prop kind"
                value={kind}
                onChange={(event) => setKind(event.target.value)}
                style={{
                  ...control,
                  flex: '0 1 auto',
                  minWidth: 0,
                  fontSize: 12,
                }}
              >
                <option value="all">All props</option>
                <option value="included">Included</option>
                <option value="custom">Custom</option>
              </select>
              <select
                aria-label="Filter prop requirement"
                value={visibility}
                onChange={(event) => setVisibility(event.target.value)}
                style={{
                  ...control,
                  flex: '0 1 auto',
                  minWidth: 0,
                  fontSize: 12,
                }}
              >
                <option value="all">Any requirement</option>
                <option value="required">Required</option>
                <option value="optional">Optional</option>
              </select>
            </div>
          )}
          {rows.length > 0 && (
            <p aria-live="polite" style={{ color: '#94a3b8', fontSize: 11 }}>
              {filtered.length} of {rows.length} props
            </p>
          )}
          <ul
            aria-label="Prop list"
            style={{ padding: 0, margin: 0, listStyle: 'none' }}
          >
            {filtered.map((row) => (
              <li
                key={`${row.kind}-${row.name}`}
                style={{
                  padding: '12px 0',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  alignItems: 'center',
                }}
              >
                <code
                  style={{
                    maxWidth: '100%',
                    fontSize: 13,
                    background: 'transparent',
                    padding: 0,
                    borderRadius: 0,
                    color: '#f1f5f9',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {row.name}
                </code>
                {row.type &&
                  chip(
                    row.type,
                    row.visibility ?? 'optional',
                    `${
                      row.visibility === 'required' ? 'Required' : 'Optional'
                    } prop. Type: ${row.type}`
                  )}
                {row.visibility &&
                  chip(
                    row.visibility,
                    row.visibility,
                    explanations[row.visibility]
                  )}
                {chip(row.kind, row.kind, explanations[row.kind])}
                {row.locations.map((location) =>
                  chip(location, location, explanations[location])
                )}
              </li>
            ))}
          </ul>
          {filtered.length === 0 && (
            <p style={{ color: '#94a3b8', fontSize: 12 }}>
              {rows.length
                ? 'No props match these filters.'
                : 'No props declared for this node.'}
            </p>
          )}
        </section>
      )}
    </>
  );
}
