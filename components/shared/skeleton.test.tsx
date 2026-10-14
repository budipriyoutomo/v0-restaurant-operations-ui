import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ListSkeleton } from './skeleton'

describe('ListSkeleton', () => {
  it('is announced once as loading, with the placeholders hidden from screen readers', () => {
    const { container } = render(<ListSkeleton rows={3} />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(4)
  })
})
