import { useState } from 'react';
import type {
  GraphNode,
  GraphSnapshot,
  InspectionSource,
  SourceLocation,
} from '@jfdevelops/react-layout-devtools-core';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { control } from './theme';
import type { ChipPalette } from './config';

function SourceLink({
  label,
  location,
}: {
  label: string;
  location: SourceLocation;
}) {
  const [error, setError] = useState<string>();
  const url = location.editorUrl;
  const path = `${location.file}:${location.line}:${location.column}`;

  // Adapters may only request the same-origin Vite editor endpoint.
  const canOpen = url?.startsWith('/') && !url.startsWith('//');

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span style={{ color: '#94a3b8' }}>{label}</span>
      {canOpen ? (
        <Button
          type="button"
          title="Open in editor"
          style={{
            background: 'transparent',
            border: 0,
            padding: 0,
            color: '#7dd3fc',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            textAlign: 'left',
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
          }}
          onClick={async () => {
            try {
              const response = await fetch(url!);

              if (!response.ok) throw new Error('Editor request failed');

              setError(undefined);
            } catch {
              setError(
                'Could not open your editor. Check the Vite server and editor configuration.'
              );
            }
          }}
        >
          {path}
        </Button>
      ) : (
        <span
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            overflowWrap: 'anywhere',
          }}
        >
          {path}
        </span>
      )}
      {error && <span role="alert">{error}</span>}
    </div>
  );
}

export function NodeSource({ node }: { node: GraphNode }) {
  if (!node.source && !node.registrationSource) return null;

  const separate =
    node.registrationSource &&
    JSON.stringify(node.registrationSource) !== JSON.stringify(node.source);

  return (
    <section aria-label="Source" style={{ display: 'grid', gap: 8 }}>
      <h4 style={{ margin: 0, fontSize: 13 }}>Source</h4>
      {node.source && <SourceLink label="Declaration" location={node.source} />}
      {separate && (
        <SourceLink label="Registration" location={node.registrationSource!} />
      )}
    </section>
  );
}

export function StatePreview({
  layout,
  state,
  graph,
  inspector,
  palette,
}: {
  layout?: string;
  state?: string;
  graph: GraphSnapshot;
  inspector?: InspectionSource;
  palette: ChipPalette;
}) {
  const [chosen, setChosen] = useState<string>();
  const instances = (graph.instances ?? []).filter(
    (instance) => instance.layout === layout
  );
  const instance =
    instances.find((entry) => entry.id === chosen) ??
    instances.find((entry) => (entry.forcedState ?? entry.state) === state) ??
    instances[0];

  if (!instance || !inspector?.preview) return null;

  const byId = new Map(graph.nodes.map((node) => [node.id, node]));

  return (
    <section aria-label="State preview" style={{ display: 'grid', gap: 10 }}>
      <h4 style={{ margin: 0, fontSize: 13 }}>State preview</h4>
      <p style={{ margin: 0, color: '#94a3b8', fontSize: 12 }}>
        Preview declared render states using current props and typed preview
        fixtures. This changes rendering only; application data and requests
        continue normally.
      </p>
      <label>
        Mounted instance{' '}
        <select
          aria-label="Preview instance"
          value={instance.id}
          onChange={(event) => setChosen(event.target.value)}
          style={control}
        >
          {instances.map((entry, index) => (
            <option key={entry.id} value={entry.id}>
              Instance {index + 1} ·{' '}
              {byId.get(entry.state)?.label ?? entry.state}
            </option>
          ))}
        </select>
      </label>
      {instance.forcedState && (
        <Badge style={palette.active}>
          Forced:{' '}
          {byId.get(instance.forcedState)?.label ?? instance.forcedState}
        </Badge>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <Button
          type="button"
          aria-pressed={!instance.forcedState}
          style={control}
          onClick={() => inspector.preview?.(instance.id)}
        >
          Auto
        </Button>
        {instance.states.map((id) => (
          <Button
            key={id}
            type="button"
            aria-pressed={instance.forcedState === id}
            style={control}
            onClick={() => inspector.preview?.(instance.id, id)}
          >
            {byId.get(id)?.label ?? id}
          </Button>
        ))}
        {state && instance.states.includes(state) && (
          <Button
            type="button"
            style={control}
            onClick={() => inspector.preview?.(instance.id, state)}
          >
            Preview this state
          </Button>
        )}
      </div>
      {instance.error && (
        <p role="alert" style={{ margin: 0, color: '#fca5a5' }}>
          {instance.error} Supply the required props with defineLayoutPreview,
          or select Auto.
        </p>
      )}
    </section>
  );
}
