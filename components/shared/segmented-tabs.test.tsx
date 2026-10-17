// Shared segmented tabs (Todo-UI 0.1). Written first (TDD).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SegmentedTabs } from './segmented-tabs'

const tabs = [
  { id: 'today', label: 'Today' },
  { id: 'history', label: <>History <span>3</span></> },
] as const

describe('SegmentedTabs', () => {
  it('is a labelled tablist with the current tab selected', () => {
    render(<SegmentedTabs label="Daily Ops" tabs={tabs} value="today" onChange={() => {}} />)
    expect(screen.getByRole('tablist', { name: 'Daily Ops' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Today' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'History 3' })).toHaveAttribute('aria-selected', 'false')
  })

  it('reports the chosen tab', async () => {
    const onChange = vi.fn()
    render(<SegmentedTabs label="Daily Ops" tabs={tabs} value="today" onChange={onChange} />)
    await userEvent.click(screen.getByRole('tab', { name: 'History 3' }))
    expect(onChange).toHaveBeenCalledWith('history')
  })

  it('moves with the arrow keys', async () => {
    const onChange = vi.fn()
    render(<SegmentedTabs label="Daily Ops" tabs={tabs} value="today" onChange={onChange} />)
    screen.getByRole('tab', { name: 'Today' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('history')
    expect(screen.getByRole('tab', { name: 'History 3' })).toHaveFocus()
  })

  it('keeps only the selected tab in the Tab order', () => {
    render(<SegmentedTabs label="Daily Ops" tabs={tabs} value="today" onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: 'Today' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'History 3' })).toHaveAttribute('tabindex', '-1')
  })
})
