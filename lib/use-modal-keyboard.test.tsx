// Keyboard for hand-made dialogs and drawers (Todo-Pilot §26 / UX-13).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useModalKeyboard } from './use-modal-keyboard'

function Modal({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useModalKeyboard(ref, onClose)
  return (
    <div ref={ref} role="dialog" aria-label="Edit">
      <button>First</button>
      <input aria-label="Name" />
      <button>Last</button>
    </div>
  )
}

function Page() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && <Modal onClose={() => setOpen(false)} />}
    </>
  )
}

describe('useModalKeyboard', () => {
  it('moves focus in, keeps Tab inside, Escape closes and focus goes back', async () => {
    render(<Page />)
    const opener = screen.getByRole('button', { name: 'Open' })
    await userEvent.click(opener)
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()

    await userEvent.tab(); await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()      // wrapped, not out to the page
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('Escape closes only the topmost of two', async () => {
    const outer = vi.fn(), inner = vi.fn()
    render(<><Modal onClose={outer} /><Modal onClose={inner} /></>)
    await userEvent.keyboard('{Escape}')
    expect(inner).toHaveBeenCalledTimes(1)
    expect(outer).not.toHaveBeenCalled()
  })
})
