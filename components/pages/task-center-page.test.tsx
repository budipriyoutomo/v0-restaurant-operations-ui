// Task Center — columns paged by the server (Todo-Pilot §22), reasons before
// the click (Todo-Pilot §23 / UX-10).
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api-client'
import { useIssueStore } from '@/lib/store'
import type { Task, User } from '@/lib/types'
import { TaskCenterPage } from './task-center-page'

const task = (id: string, issueId: string, over: Partial<Task> = {}) => ({
  id, number: `TSK-${id}`, title: `Task ${id}`, description: '', status: 'open', priority: 'medium',
  assignee: 'Budi', assigneeUserId: 'u1', dueDate: null, outlet: 'Jakarta', issueId, issueNumber: `ISS-${issueId}`, ...over,
}) as Task

let server: Task[] = []

beforeEach(() => {
  server = [
    task('1', 'i1', { title: 'Live task', issueStatus: 'in-progress' }),
    task('2', 'i2', { title: 'Old task', status: 'resolved', issueStatus: 'closed' }),
  ]
  // Spy on the shared api object (the store is loaded before vi.mock could apply).
  vi.spyOn(api, 'getPage').mockImplementation((async (path: string) => {
    const url = new URL(path, 'http://x')
    const st = url.searchParams.get('status')
    const rows = url.searchParams.get('late') ? [] : server.filter((t) => !st || t.status === st)
    return { items: rows.slice(0, Number(url.searchParams.get('limit') ?? 99)), total: rows.length }
  }) as never)
  useIssueStore.setState({
    currentUser: { id: 'u1', permissions: { tasks: 'manage' } } as unknown as User,
    issues: [], tasks: [], updateTaskStatus: vi.fn(),
  })
})
afterEach(() => vi.restoreAllMocks())

async function renderBoard() {
  render(<TaskCenterPage />)
  await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull())
}

describe('TaskCenterPage — moving a task', () => {
  it('a task of a closed issue cannot move, and says why', async () => {
    await renderBoard()
    const [live, old] = screen.getAllByRole('combobox', { name: /move task to status/i })
    expect(live).toBeEnabled()
    expect(old).toBeDisabled()
    expect(old).toHaveAccessibleDescription('ISS-i2 is finished — reopen the issue to change its tasks.')
  })
})

describe('TaskCenterPage — server columns (Todo-Pilot §22)', () => {
  it('each column asks the server for its own status, and counts the rest', async () => {
    server = Array.from({ length: 53 }, (_, n) => task(String(n), 'i1'))
    await renderBoard()
    expect(api.getPage).toHaveBeenCalledWith('/api/tasks?status=open&limit=50&offset=0')
    expect(api.getPage).toHaveBeenCalledWith('/api/tasks?status=closed&limit=50&offset=0')
    expect(screen.getAllByText(/^Task \d+$/)).toHaveLength(50)
    expect(screen.getByText('+ 3 more — narrow the search')).toBeInTheDocument()
    expect(screen.getByText('Total tasks').previousSibling).toHaveTextContent('53')
  })
})
