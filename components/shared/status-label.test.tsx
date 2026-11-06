// Status as a dot + text, not a pill (Todo-Modern-UI Fase 1). Written first (TDD).
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusLabel } from './status-label'
import { PriorityBadge, StatusBadge } from './priority-badge'
import { RecordId } from './record-id'

describe('StatusLabel', () => {
  it('shows the text in the signal colour with a decorative dot', () => {
    const { container } = render(<StatusLabel signal="action">Terlambat</StatusLabel>)
    const label = screen.getByText('Terlambat')
    expect(label).toHaveClass('text-destructive')
    const dot = container.querySelector('[aria-hidden="true"]')
    expect(dot).toHaveClass('bg-destructive', 'rounded-full')
    expect(label.className).not.toMatch(/\bbg-|px-2/)       // no pill
  })

  it('waiting uses the darker amber for text and the brighter one for the dot', () => {
    const { container } = render(<StatusLabel signal="waiting">Menunggu</StatusLabel>)
    expect(screen.getByText('Menunggu')).toHaveClass('text-warning')
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass('bg-warning-mark')
  })
})

describe('StatusBadge / PriorityBadge', () => {
  it('map statuses and priorities to signals', () => {
    render(<><StatusBadge status="overdue" /><StatusBadge status="open" /><PriorityBadge priority="high" /></>)
    expect(screen.getByText('Overdue')).toHaveClass('text-destructive')
    expect(screen.getByText('Open')).toHaveClass('text-foreground')
    expect(screen.getByText('High')).toHaveClass('text-warning')
  })
})

describe('RecordId', () => {
  it('is small and grey, not monospace', () => {
    render(<RecordId id="ISS-0042" />)
    const id = screen.getByText('ISS-0042')
    expect(id).toHaveClass('text-xs', 'text-muted-foreground')
    expect(id).not.toHaveClass('font-mono')
  })
})
