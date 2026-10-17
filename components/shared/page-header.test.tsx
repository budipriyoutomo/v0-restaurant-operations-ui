// One page header and one filter-chip style for every page. Written first (TDD).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FilterChip, FilterToggle, PageHeader } from './page-header'

describe('PageHeader', () => {
  it('renders the page title, description and actions', () => {
    render(<PageHeader title="Laporan" description="Semua laporan" actions={<button>Baru</button>} />)
    expect(screen.getByRole('heading', { name: 'Laporan', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Semua laporan')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Baru' })).toBeInTheDocument()
  })
})

describe('FilterChip', () => {
  it('is a pressed/unpressed button', async () => {
    const onClick = vi.fn()
    render(<FilterChip active onClick={onClick}>High</FilterChip>)
    const chip = screen.getByRole('button', { name: 'High' })
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(chip)
    expect(onClick).toHaveBeenCalled()
  })
})

describe('FilterToggle', () => {
  it('looks like a chip but stays a labelled checkbox', async () => {
    const onChange = vi.fn()
    render(<FilterToggle checked={false} onChange={onChange}>Ready to close only</FilterToggle>)
    await userEvent.click(screen.getByLabelText('Ready to close only'))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
