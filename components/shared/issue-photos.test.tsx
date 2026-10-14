// Photos on an Issue in its drawer (Todo-Pilot §20). Written first (TDD).
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api-client')>()),
  api: { objectUrl: vi.fn(async (p: string) => `blob:${p}`) },
}))

import { IssuePhotos } from './issue-photos'

// jsdom has no object URLs; AuthedImage revokes them on unmount.
URL.revokeObjectURL = vi.fn()
import type { IssuePhoto } from '@/lib/types'

const photo = (id: string, caption: string | null = null): IssuePhoto => ({
  id, caption, mimeType: 'image/jpeg', createdAt: '2026-10-14T05:00:00Z',
  fileUrl: `/api/issues/i1/photos/${id}/file`, thumbnailUrl: `/api/issues/i1/photos/${id}/thumbnail`,
})

describe('IssuePhotos', () => {
  it('loads nothing when the issue has no photos', () => {
    const load = vi.fn()
    const { container } = render(<IssuePhotos issueId="i1" count={0} load={load} />)
    expect(load).not.toHaveBeenCalled()
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the thumbnails of the issue', async () => {
    const load = vi.fn().mockResolvedValue([photo('p1', 'Pipa bocor'), photo('p2')])
    render(<IssuePhotos issueId="i1" count={2} load={load} />)
    expect(load).toHaveBeenCalledWith('i1')
    expect(await screen.findByRole('img', { name: 'Pipa bocor' })).toHaveAttribute('src', 'blob:/api/issues/i1/photos/p1/thumbnail')
    expect(screen.getAllByRole('img')).toHaveLength(2)
  })

  it('opens the full photo on tap', async () => {
    const load = vi.fn().mockResolvedValue([photo('p1', 'Pipa bocor')])
    render(<IssuePhotos issueId="i1" count={1} load={load} />)
    await userEvent.click(await screen.findByRole('button', { name: /pipa bocor/i }))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    await waitFor(() => expect(screen.getAllByRole('img', { name: 'Pipa bocor' }).map((i) => i.getAttribute('src')))
      .toContain('blob:/api/issues/i1/photos/p1/file'))
  })
})
