// Shared side drawer for record details (Todo-UI 0.2). Written first (TDD).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SideDrawer } from './side-drawer'

function renderDrawer(onClose = vi.fn()) {
  render(
    <SideDrawer label="Issue ISS-1" number="ISS-1" title="Freezer bocor" closeLabel="Close" onClose={onClose}>
      <p>Body</p>
    </SideDrawer>,
  )
  return onClose
}

describe('SideDrawer', () => {
  it('is a modal dialog named by its caller, with number and title in the header', () => {
    renderDrawer()
    const dialog = screen.getByRole('dialog', { name: 'Issue ISS-1' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('heading', { name: 'Freezer bocor', level: 2 })).toBeInTheDocument()
    expect(screen.getByText('ISS-1')).toBeInTheDocument()
    expect(screen.getByText('Body')).toBeInTheDocument()
  })

  it('closes with the button, Escape and the backdrop', async () => {
    const onClose = renderDrawer()
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByTestId('side-drawer-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('shows a subtitle under the title', () => {
    render(
      <SideDrawer label="Participants" title="Food safety" subtitle="Dago · 12 enrolled" closeLabel="Close" onClose={() => {}}>
        <p>Body</p>
      </SideDrawer>,
    )
    expect(screen.getByText('Dago · 12 enrolled')).toBeInTheDocument()
  })
})
