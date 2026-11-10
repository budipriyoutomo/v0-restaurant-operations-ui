// One KPI status bar for the module pages (Todo-Modern-UI Fase 4). Written first (TDD).
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { KpiStrip } from './kpi-strip'

describe('KpiStrip', () => {
  it('lists each figure as a term and its value', () => {
    render(<KpiStrip label="Ringkasan" items={[{ label: 'Total', value: 12 }, { label: 'Pending', value: 3, signal: 'waiting' }]} />)
    const strip = screen.getByRole('region', { name: 'Ringkasan' })
    expect(within(strip).getByText('Total').closest('div')).toHaveTextContent('Total12')
    expect(within(strip).getByText('3')).toHaveClass('text-warning')
  })

  it('a zero keeps the neutral colour even when it has a signal', () => {
    render(<KpiStrip label="K" items={[{ label: 'Total', value: 4 }, { label: 'Rejected', value: 0, signal: 'action' }]} />)
    expect(screen.getByText('0')).not.toHaveClass('text-destructive')
    expect(screen.getByText('0')).toHaveClass('text-foreground')
  })

  it('is not shown while the module has no data at all', () => {
    const { container } = render(<KpiStrip label="K" items={[{ label: 'Total', value: 0 }, { label: 'PM', value: null }]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('while loading shows placeholders, never a coloured 0', () => {
    render(<KpiStrip label="K" loading items={[{ label: 'Admin', value: 0, signal: 'action' }]} />)
    const strip = screen.getByRole('region', { name: 'K' })
    expect(strip).toHaveAttribute('aria-busy', 'true')
    expect(within(strip).queryByText('0')).not.toBeInTheDocument()
    expect(within(strip).getByText('Admin')).toBeInTheDocument()
  })

  it('shows a hint under the value and "—" for a figure without data', () => {
    render(<KpiStrip label="K" items={[{ label: 'WO', value: 2, hint: '1 overdue' }, { label: 'PM', value: null }]} />)
    expect(screen.getByText('1 overdue')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
