import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ViewMap } from './ViewMap'

describe('ViewMap', () => {
  it('renders an iframe with library defaults', () => {
    render(<ViewMap src="https://example.com/embed" />)

    const frame = screen.getByTitle('Map')

    expect(frame).toHaveAttribute('src', 'https://example.com/embed')
    expect(frame).toHaveAttribute('loading', 'lazy')
    expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer-when-downgrade')
    expect(frame).toHaveStyle({ width: '100%' })
    expect(frame.getAttribute('style')).toContain('border: 0px;')
    expect(frame.getAttribute('style')).toContain('min-height: 320px;')
  })

  it('lets callers override the defaults', () => {
    render(
      <ViewMap
        loading="eager"
        style={{ minHeight: 480 }}
        title="Custom map"
        srcDoc="<p>Embedded map</p>"
      />,
    )

    const frame = screen.getByTitle('Custom map')

    expect(frame).toHaveAttribute('loading', 'eager')
    expect(frame).toHaveStyle({ minHeight: '480px' })
  })
})
