// Issue comments in the drawer (Todo-Ops-Checklist P3). Written first (TDD).
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IssueComments } from './issue-comments'
import { QueuedError } from '@/lib/api-client'
import type { IssueComment } from '@/lib/types'

const c = (over: Partial<IssueComment>): IssueComment => ({
  id: 'c1', issueId: 'i1', body: 'Sudah dicek', kind: 'user', authorUserId: 'u1', authorName: 'Andi',
  createdAt: '2026-10-15T08:00:00Z', ...over,
})

function setup(comments: IssueComment[], add = vi.fn(async (_id: string, body: string) => c({ id: 'new', body }))) {
  const load = vi.fn().mockResolvedValue(comments)
  render(<IssueComments issueId="i1" load={load} add={add} />)
  return { load, add, user: userEvent.setup() }
}

describe('IssueComments', () => {
  it('lists comments oldest first with their author', async () => {
    setup([c({ id: 'a', body: 'Pertama' }), c({ id: 'b', body: 'Kedua', authorName: 'Budi' })])
    const items = await screen.findAllByRole('listitem')
    expect(items.map((i) => i.textContent)).toEqual([
      expect.stringContaining('Pertama'), expect.stringContaining('Kedua'),
    ])
    expect(items[1]).toHaveTextContent('Budi')
  })

  it('marks system comments', async () => {
    setup([c({ kind: 'system', authorUserId: null, authorName: 'Sistem', body: 'Gagal lagi 16-10-2026' })])
    const item = await screen.findByRole('listitem')
    expect(item).toHaveTextContent(/system/i)
    expect(item).toHaveTextContent('Gagal lagi 16-10-2026')
  })

  it('says when there are no comments yet', async () => {
    setup([])
    expect(await screen.findByText(/no comments yet/i)).toBeInTheDocument()
  })

  it('posts a comment and shows it', async () => {
    const { user, add } = setup([])
    await screen.findByText(/no comments yet/i)
    const send = screen.getByRole('button', { name: /send/i })
    expect(send).toBeDisabled()
    await user.type(screen.getByLabelText(/write a comment/i), 'Teknisi datang jam 3')
    await user.click(send)
    expect(add).toHaveBeenCalledWith('i1', 'Teknisi datang jam 3')
    expect(await screen.findByText('Teknisi datang jam 3')).toBeInTheDocument()
    expect(screen.getByLabelText(/write a comment/i)).toHaveValue('')
  })

  it('keeps an offline comment as pending', async () => {
    const add = vi.fn(async () => { throw new QueuedError('Komentar') })
    const { user } = setup([], add)
    await screen.findByText(/no comments yet/i)
    await user.type(screen.getByLabelText(/write a comment/i), 'Di ruang chiller, tanpa sinyal')
    await user.click(screen.getByRole('button', { name: /send/i }))
    const item = await screen.findByRole('listitem')
    expect(item).toHaveTextContent('Di ruang chiller, tanpa sinyal')
    expect(item).toHaveTextContent(/will be sent/i)
  })

  it('keeps the text when sending fails', async () => {
    const add = vi.fn(async () => { throw new Error('API 500') })
    const { user } = setup([], add)
    await screen.findByText(/no comments yet/i)
    await user.type(screen.getByLabelText(/write a comment/i), 'Coba lagi')
    await user.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByLabelText(/write a comment/i)).toHaveValue('Coba lagi')
  })
})
