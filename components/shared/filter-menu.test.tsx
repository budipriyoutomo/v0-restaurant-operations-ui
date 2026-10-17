// Every list filter is a dropdown: tidy on a phone, one row on a desktop.
// Written first (TDD).
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FilterOptions, FilterSelect } from './filter-menu'

const priorities = [
  { value: 'high', label: 'High' },
  { value: 'low', label: 'Low' },
]

function Priority({ initial = null as string | null, onChange = vi.fn() }) {
  const [value, setValue] = useState<string | null>(initial)
  return <FilterSelect label="Priority" allLabel="All" value={value} options={priorities}
    onChange={(v) => { setValue(v); onChange(v) }} />
}

describe('FilterSelect', () => {
  it('names the filter and its current choice on the button', () => {
    render(<Priority />)
    expect(screen.getByRole('button', { name: 'Priority: All' })).toBeInTheDocument()
  })

  it('picks one option from the menu', async () => {
    const onChange = vi.fn()
    render(<Priority onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Priority: All' }))
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'High' }))
    expect(onChange).toHaveBeenCalledWith('high')
    expect(screen.getByRole('button', { name: 'Priority: High' })).toHaveAttribute('data-active', 'true')
  })

  it('goes back to all', async () => {
    const onChange = vi.fn()
    render(<Priority initial="low" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Priority: Low' }))
    expect(screen.getByRole('menuitemradio', { name: 'Low' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'All' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('without an "all" choice offers only the options', async () => {
    render(<FilterSelect label="Status" value="high" options={priorities} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Status: High' }))
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(2)
  })
})

describe('FilterOptions', () => {
  it('holds yes/no filters as checkboxes and counts the ones that are on', async () => {
    const onHide = vi.fn()
    render(<FilterOptions label="Show" items={[
      { label: 'Hide finished', checked: true, onChange: vi.fn() },
      { label: 'Ready to close only', checked: false, onChange: onHide },
    ]} />)
    await userEvent.click(screen.getByRole('button', { name: 'Show (1)' }))
    expect(screen.getByRole('menuitemcheckbox', { name: 'Hide finished' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Ready to close only' }))
    expect(onHide).toHaveBeenCalledWith(true)
  })
})
