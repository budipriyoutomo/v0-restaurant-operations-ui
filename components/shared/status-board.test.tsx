// Status board: a kanban on a wide screen, status tabs + one list on a phone.
// Written first (TDD).
import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StatusBoard, type BoardColumn } from './status-board'

type Item = { id: string; title: string }
const meta = { dot: 'bg-blue-500', accent: 'border-t-blue-500', ring: 'ring-blue-500/40' }
const columns: BoardColumn<'open' | 'doing' | 'done', Item>[] = [
  { id: 'open', label: 'Open', ...meta, items: [] },
  { id: 'doing', label: 'Doing', ...meta, items: [{ id: 'a', title: 'Fix stove' }, { id: 'b', title: 'Clean hood' }] },
  { id: 'done', label: 'Done', ...meta, items: [{ id: 'c', title: 'Paint wall' }], footer: <p>+ 4 more</p>, count: 5 },
]

/** jsdom has no matchMedia: answer every query with `wide`. */
function screenIs(wide: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: wide, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }))
}
afterEach(() => vi.unstubAllGlobals())

function Board({ onDrop = vi.fn(), initial }: { onDrop?: (id: string, to: string) => void; initial?: 'open' | 'doing' | 'done' | null }) {
  const [value, setValue] = useState<'open' | 'doing' | 'done' | null>(initial ?? null)
  return (
    <StatusBoard label="Tasks" columns={columns} getId={(i) => i.id} value={value} onValueChange={setValue}
      emptyText="Nothing here" dropHereText="Drop here" onDrop={onDrop}
      renderCard={(item, drag) => <div draggable={drag.draggable} onDragStart={drag.onDragStart}>{item.title}</div>} />
  )
}

describe('StatusBoard on a phone', () => {
  it('shows status tabs with counts and opens on the first status that has cards', () => {
    screenIs(false)
    render(<Board />)
    const tabs = screen.getByRole('tablist', { name: 'Tasks' })
    expect(within(tabs).getAllByRole('tab').map((t) => t.textContent)).toEqual(['Open0', 'Doing2', 'Done5'])
    expect(screen.getByRole('tab', { name: /Doing/ })).toHaveAttribute('aria-selected', 'true')
    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getByText('Fix stove')).toBeInTheDocument()
    expect(screen.queryByText('Paint wall')).not.toBeInTheDocument()
  })

  it('switches status from a tab, and shows that list with its footer', async () => {
    screenIs(false)
    render(<Board />)
    await userEvent.click(screen.getByRole('tab', { name: /Done/ }))
    expect(screen.getByText('Paint wall')).toBeInTheDocument()
    expect(screen.getByText('+ 4 more')).toBeInTheDocument()
    expect(screen.queryByText('Fix stove')).not.toBeInTheDocument()
  })

  it('keeps a chosen empty status and says so', () => {
    screenIs(false)
    render(<Board initial="open" />)
    expect(screen.getByRole('tab', { name: /Open/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })

  it('cards are not draggable (touch screens cannot drag)', () => {
    screenIs(false)
    render(<Board />)
    expect(screen.getByText('Fix stove')).toHaveAttribute('draggable', 'false')
  })
})

describe('StatusBoard on a wide screen', () => {
  it('shows every status as a column, no tabs', () => {
    screenIs(true)
    render(<Board />)
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    for (const name of ['Open', 'Doing', 'Done']) expect(screen.getByRole('region', { name })).toBeInTheDocument()
    expect(screen.getByText('Fix stove')).toBeInTheDocument()
    expect(screen.getByText('Paint wall')).toBeInTheDocument()
  })

  it('moves a card by dragging it onto another column', () => {
    screenIs(true)
    const onDrop = vi.fn()
    render(<Board onDrop={onDrop} />)
    fireEvent.dragStart(screen.getByText('Fix stove'))
    fireEvent.dragOver(screen.getByRole('region', { name: 'Done' }))
    fireEvent.drop(screen.getByRole('region', { name: 'Done' }))
    expect(onDrop).toHaveBeenCalledWith('a', 'done')
  })
})
