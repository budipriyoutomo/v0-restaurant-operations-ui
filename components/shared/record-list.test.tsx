// Dense record rows for module lists (Todo-Modern-UI Fase 4). Written first (TDD).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RecordList, RecordRow } from './record-list'

describe('RecordList', () => {
  it('is a labelled list of rows, each one button named by number and title', async () => {
    const onOpen = vi.fn()
    render(
      <RecordList label="Permintaan">
        <RecordRow id="r1" number="ISS-1" title="Beli kompor" meta={['Kemang', 'Budi']} aside={<span>Terbuka</span>} onOpen={onOpen} />
      </RecordList>,
    )
    const list = screen.getByRole('list', { name: 'Permintaan' })
    const row = screen.getByRole('button', { name: 'ISS-1 Beli kompor' })
    expect(list).toContainElement(row)
    expect(row).toHaveAccessibleDescription(/Kemang.*Budi.*Terbuka/)
    await userEvent.click(row)
    expect(onOpen).toHaveBeenCalled()
  })

  it('without onOpen a row is plain text, not a button', () => {
    render(<RecordList label="L"><RecordRow id="r1" title="Vendor A" meta={[null, 'Kemang']} /></RecordList>)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('Kemang')).toBeInTheDocument()
  })
})
