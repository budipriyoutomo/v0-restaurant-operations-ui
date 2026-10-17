// One module's access level in the role editor (Todo-UI #6). Written first (TDD).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AccessLevelPicker } from './access-level-picker'

const labels = { none: 'No access', view: 'View', manage: 'Manage' }

describe('AccessLevelPicker', () => {
  it('is a radio group named by the module, with the level checked', () => {
    render(<AccessLevelPicker label="Issues" value="view" manageable onChange={() => {}} labels={labels} />)
    const group = screen.getByRole('radiogroup', { name: 'Issues' })
    expect(group).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'View' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Manage' })).toHaveAttribute('aria-checked', 'false')
  })

  it('reports the chosen level', async () => {
    const onChange = vi.fn()
    render(<AccessLevelPicker label="Issues" value="none" manageable onChange={onChange} labels={labels} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Manage' }))
    expect(onChange).toHaveBeenCalledWith('manage')
  })

  it('cannot pick manage on a view-only module', () => {
    render(<AccessLevelPicker label="Reports" value="view" manageable={false} onChange={() => {}} labels={labels} />)
    expect(screen.getByRole('radio', { name: 'Manage' })).toBeDisabled()
  })
})
