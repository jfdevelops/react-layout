import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createBreadcrumbComposable } from '../src';

describe('createBreadcrumbComposable', () => {
  it('renders breadcrumb segments', () => {
    const Breadcrumb = createBreadcrumbComposable(({ segments }) => (
      <nav aria-label='Breadcrumb'>
        {Object.entries(segments).map(([key, segment]) => {
          const label = typeof segment === 'string' ? segment : segment.value;

          return <span key={key}>{label}</span>;
        })}
      </nav>
    ));

    render(
      <Breadcrumb.Breadcrumb
        segments={{
          home: 'Home',
          users: { value: 'Users', isActive: true },
        }}
      />,
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(Breadcrumb.Breadcrumb.displayName).toBe('Breadcrumb');
  });
});
