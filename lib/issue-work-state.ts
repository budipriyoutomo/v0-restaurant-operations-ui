// Where an Issue stands for the GM (Todo-Pilot §18 / UX-5, Option A):
//   in-progress     work is still going on
//   awaiting-close  the work is finished (backend `readyToClose`, or `resolved`),
//                   only the manager's close is missing
//   done            closed or cancelled
import type { Issue } from './types'

export type IssueWorkState = 'in-progress' | 'awaiting-close' | 'done'

export function issueWorkState(issue: Pick<Issue, 'status' | 'readyToClose'>): IssueWorkState {
  if (issue.status === 'closed' || issue.status === 'cancelled') return 'done'
  if (issue.readyToClose || issue.status === 'resolved') return 'awaiting-close'
  return 'in-progress'
}

export function countByWorkState(issues: Pick<Issue, 'status' | 'readyToClose'>[]): Record<IssueWorkState, number> {
  const counts: Record<IssueWorkState, number> = { 'in-progress': 0, 'awaiting-close': 0, done: 0 }
  for (const issue of issues) counts[issueWorkState(issue)] += 1
  return counts
}
