// One select for kanban and forms (Todo-Modern-UI Fase 1). Written first (TDD).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Select } from './select'

describe('Select', () => {
  it('is a native select with the shared look, labelled and controllable', async () => {
    const onChange = vi.fn()
    render(
      <label>Outlet
        <Select value="a" onChange={(e) => onChange(e.target.value)}>
          <option value="a">Kemang</option>
          <option value="b">Senopati</option>
        </Select>
      </label>,
    )
    const select = screen.getByRole('combobox', { name: /outlet/i })
    expect(select).toHaveClass('border-input', 'rounded-md', 'appearance-none')
    await userEvent.selectOptions(select, 'b')
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('passes className and disabled through', () => {
    render(<Select aria-label="x" className="w-40" disabled><option>1</option></Select>)
    const select = screen.getByRole('combobox', { name: 'x' })
    expect(select).toBeDisabled()
    expect(select.parentElement).toHaveClass('w-40')
  })
})
