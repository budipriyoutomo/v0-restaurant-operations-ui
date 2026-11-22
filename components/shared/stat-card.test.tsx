// One KPI card for every page: StatCard absorbed the dashboard's KPICard
// (Todo-Modern-UI Fase 1). Written first (TDD).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StatCard } from './stat-card'

describe('StatCard', () => {
  it('shows title, value and subtitle; the value wears text colour unless it signals', () => {
    render(<><StatCard title="Total" value="12" subtitle="semua" /><StatCard title="Terlambat" value="3" variant="critical" /></>)
    expect(screen.getByText('12')).not.toHaveClass('text-destructive')
    expect(screen.getByText('3')).toHaveClass('text-destructive')
    expect(screen.getByText('semua')).toBeInTheDocument()
    expect(screen.getByText('Total').closest('[data-kpi]')).toHaveClass('rounded-md')
  })

  it('a card with a drill-down is one button', async () => {
    const onClick = vi.fn()
    render(<StatCard title="Siap ditutup" value="4" onClick={onClick} />)
    await userEvent.click(screen.getByRole('button', { name: /siap ditutup/i }))
    expect(onClick).toHaveBeenCalled()
  })

  it('without onClick it is not a button', () => {
    render(<StatCard title="Total" value="1" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
