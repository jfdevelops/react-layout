import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createBreadcrumbComposable } from '../src';
import { composablePresetMetaKey } from '@jfdevelops/react-layout-composables';
import { z } from 'zod';

describe('createBreadcrumbComposable', () => {
  it('adds props and replaces segments without changing the defaults', () => {
    const { Breadcrumb } = createBreadcrumbComposable({
      props: {
        segments: z.array(
          z.object({
            label: z.string(),
          }),
        ),
        separator: z.string(),
      },
      render: ({ segments, separator }) => (
        <nav>{segments.map((segment) => segment.label).join(separator)}</nav>
      ),
    });

    render(
      <Breadcrumb
        segments={[
          {
            label: 'Home',
          },
          {
            label: 'Docs',
          },
        ]}
        separator=' / '
      />,
    );
    expect(screen.getByText('Home / Docs')).toBeInTheDocument();
    expect(Breadcrumb[composablePresetMetaKey].props.segments['~standard'].vendor).toBe('zod');
    expect(createBreadcrumbComposable.props.segments['~standard'].vendor).toBe('arktype');
  });

  it('provides the default definitions to a customization callback', () => {
    const { Breadcrumb } = createBreadcrumbComposable({
      props: (defaults) => ({
        segments: defaults.segments,
        label: z.string(),
      }),
      render: ({ label }) => label,
    });
    expect(Breadcrumb[composablePresetMetaKey].props.segments).toBe(
      createBreadcrumbComposable.props.segments,
    );
    expect(Breadcrumb[composablePresetMetaKey].props.label['~standard'].vendor).toBe('zod');
  });

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
          users: {
            value: 'Users',
            isActive: true,
          },
        }}
      />,
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(Breadcrumb.Breadcrumb.displayName).toBe('Breadcrumb');
  });
});
