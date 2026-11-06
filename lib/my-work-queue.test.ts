// "Pekerjaan Saya" as one queue, most urgent first (Todo-Modern-UI Fase 3).
// Written first (TDD).
import { describe, expect, it } from 'vitest'
import { buildQueue, hiddenCounts } from './my-work-queue'
import type { MyWork } from './my-work-api'

const NOW = new Date(2026, 10, 7, 10, 0)            // 7 Nov 2026, 10:00 local
const sec = <T,>(items: T[], count = items.length) => ({ count, items })

const approval = (id: string, waitingSince: string, escalated = false) => ({
  id, number: `APR-${id}`, title: id, type: 'maintenance', outlet: 'Kemang', amount: 1, currency: 'IDR',
  stepOrder: 1, stepCount: 2, waitingSince, escalated })
const task = (id: string, dueDate: string | null, priority = 'medium') => ({
  id, number: `TSK-${id}`, title: id, issueId: `i-${id}`, issueNumber: `ISS-${id}`, outlet: 'Kemang',
  status: 'open', priority, dueDate })
const wo = (id: string, scheduledDate: string | null, priority = 'medium') => ({
  id, number: `WO-${id}`, title: id, assetName: 'AC', outlet: 'Kemang', status: 'scheduled', priority, scheduledDate })
const checklist = (id: string, dueAt: string | null) => ({
  id, number: `OPS-${id}`, templateName: id, shift: 'opening', outlet: 'Kemang', status: 'pending',
  opensAt: null, dueAt, closesAt: null, answered: 0, itemCount: 5 })

const empty: MyWork = { approvals: null, workOrders: null, tasks: null, readyToClose: null, guestWaiting: null, opsChecklists: null }
const ids = (work: MyWork) => buildQueue(work, NOW).map((i) => i.key)

describe('buildQueue', () => {
  it('puts late work first, then by deadline or waiting time, dateless work last', () => {
    const work: MyWork = {
      ...empty,
      tasks: sec([task('due-tomorrow', '2026-11-08'), task('late', '2026-11-06'), task('no-date', null)]),
      approvals: sec([approval('waiting-since-yesterday', new Date(2026, 10, 6, 9).toISOString())]),
      readyToClose: sec([{ id: 'close', number: 'ISS-c', title: 'close', outlet: 'Kemang', status: 'resolved' }]),
      opsChecklists: sec([checklist('checklist-late', new Date(2026, 10, 7, 9).toISOString())]),
    }
    expect(ids(work)).toEqual([
      'task:late',                        // due yesterday (end of day) — oldest late first
      'opsChecklist:checklist-late',      // due 09:00 today
      'approval:waiting-since-yesterday', // waiting is "since", so it sorts by that time
      'task:due-tomorrow',
      'task:no-date',
      'readyToClose:close',
    ])
  })

  it('a date without time is due at the end of that day', () => {
    const [item] = buildQueue({ ...empty, tasks: sec([task('today', '2026-11-07')]) }, NOW)
    expect(item.late).toBe(false)
    expect(item.signal).toBe('neutral')
  })

  it('signals: late = action, waiting for me = waiting, the rest neutral', () => {
    const work: MyWork = {
      ...empty,
      approvals: sec([approval('esc', new Date(2026, 10, 7, 8).toISOString(), true), approval('calm', new Date(2026, 10, 7, 8).toISOString())]),
      workOrders: sec([wo('late', '2026-11-01'), wo('later', '2026-11-20')]),
      guestWaiting: sec([{ id: 'g', issueId: 'ig', issueNumber: 'ISS-g', title: 'g', outlet: 'Kemang', channel: 'whatsapp',
        reportedAt: new Date(2026, 10, 7, 9).toISOString() }]),
    }
    const byKey = Object.fromEntries(buildQueue(work, NOW).map((i) => [i.key, i.signal]))
    expect(byKey).toEqual({
      'approval:esc': 'action', 'approval:calm': 'waiting', 'workOrder:late': 'action',
      'workOrder:later': 'neutral', 'guest:g': 'waiting',
    })
  })

  it('ties break by priority, then number; dateless work orders by priority', () => {
    const work: MyWork = { ...empty, workOrders: sec([wo('b', null, 'low'), wo('a', null, 'critical'), wo('c', '2026-11-09', 'low'), wo('d', '2026-11-09', 'high')]) }
    expect(ids(work)).toEqual(['workOrder:d', 'workOrder:c', 'workOrder:a', 'workOrder:b'])
  })

  it('each item opens its record; a task opens its issue', () => {
    const work: MyWork = { ...empty, tasks: sec([task('t', null)]), workOrders: sec([wo('w', null)]),
      opsChecklists: sec([checklist('o', null)]), approvals: sec([approval('a', NOW.toISOString())]) }
    const to = Object.fromEntries(buildQueue(work, NOW).map((i) => [i.key, i.to]))
    expect(to).toEqual({ 'task:t': '/issues/i-t', 'workOrder:w': '/work-orders/w', 'opsChecklist:o': '/ops/o', 'approval:a': '/approvals/a' })
  })

  it('skips sections the role cannot open', () => {
    expect(buildQueue(empty, NOW)).toEqual([])
  })
})

describe('hiddenCounts', () => {
  it('counts what the server did not list, per kind', () => {
    const work: MyWork = { ...empty, tasks: sec([task('t', null)], 6), workOrders: sec([wo('w', null)], 1) }
    expect(hiddenCounts(work)).toEqual([{ kind: 'task', count: 5 }])
  })
})
