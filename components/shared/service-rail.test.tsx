// The ticket rail of the kitchen pass (Todo-Modern-UI Fase 1): only for the GM
// dashboard, the report detail and My Work's top ticket. Written first (TDD).
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RailTicket, ServiceRail } from './service-rail'

describe('ServiceRail', () => {
  it('is a labelled list of tickets', () => {
    render(
      <ServiceRail label="Outlet hari ini">
        <RailTicket signal="action" status="2 terlambat" title="Kemang" />
        <RailTicket signal="neutral" status="Normal" title="Senopati" meta="Mgr. Rina" />
      </ServiceRail>,
    )
    const rail = screen.getByRole('region', { name: 'Outlet hari ini' })
    const tickets = within(rail).getAllByRole('listitem')
    expect(tickets).toHaveLength(2)
    expect(within(tickets[0]).getByText('Kemang')).toBeInTheDocument()
    expect(within(tickets[0]).getByText('2 terlambat')).toHaveClass('text-destructive')
    expect(within(tickets[1]).getByText('Mgr. Rina')).toBeInTheDocument()
  })

  it('a ticket with an action is one button', async () => {
    const onOpen = vi.fn()
    render(<ServiceRail label="r"><RailTicket signal="waiting" status="Menunggu" title="Kulkas bocor" onClick={onOpen} /></ServiceRail>)
    await userEvent.click(screen.getByRole('button', { name: /kulkas bocor/i }))
    expect(onOpen).toHaveBeenCalled()
  })
})
