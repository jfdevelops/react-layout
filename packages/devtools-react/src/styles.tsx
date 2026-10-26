import css from '../styles.css?inline';

export function DevtoolsStyles({
  nonce,
  styleMode,
}: {
  nonce?: string;
  styleMode?: 'inline' | 'external';
}) {
  if (styleMode === 'external') return null;

  return (
    <style nonce={nonce} data-react-layout-devtools-styles>
      {css}
    </style>
  );
}
