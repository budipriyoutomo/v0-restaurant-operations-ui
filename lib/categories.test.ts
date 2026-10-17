// Unit tests for issue-category helpers (Todo-Ops-Checklist P1). Written first (TDD).
// Categories are master data: behaviour follows `module`, never the name — the
// same rule as backend/app/core/category_defaults.py.
import { describe, expect, it } from 'vitest'
import {
  activeCategories, allowsWorkOrder, categoryByName, categoryBySystemKey, defaultsFor, issueModule,
  CATEGORY_MODULES,
} from './categories'
import type { MasterCategory } from './types'

const cat = (over: Partial<MasterCategory>): MasterCategory => ({
  id: over.name ?? 'id', name: 'X', description: '', type: 'operations', module: 'general', systemKey: null,
  isSystem: false, isActive: true, defaultGenerateTask: true, defaultGenerateApproval: false, approvalType: null,
  icon: null, ...over,
})

const maintenance = cat({ id: 'm', name: 'Perbaikan', module: 'maintenance', systemKey: 'maintenance', isSystem: true, type: 'maintenance' })
const other = cat({ id: 'o', name: 'Other', systemKey: 'other', isSystem: true })
const training = cat({ id: 't', name: 'Training', systemKey: 'training', isSystem: true, defaultGenerateApproval: true })
const hvac = cat({ id: 'h', name: 'HVAC', module: 'maintenance', type: 'maintenance' })
const archived = cat({ id: 'a', name: 'Arsip', isActive: false })
const all = [hvac, other, archived, training, maintenance]

describe('activeCategories', () => {
  it('drops inactive categories', () => {
    expect(activeCategories(all).map((c) => c.id)).not.toContain('a')
  })
  it('lists system categories first in their canonical order, then the rest by name', () => {
    expect(activeCategories(all).map((c) => c.id)).toEqual(['m', 't', 'o', 'h'])
  })
})

describe('lookups', () => {
  it('finds by system key whatever the name', () => {
    expect(categoryBySystemKey(all, 'maintenance')?.name).toBe('Perbaikan')
    expect(categoryBySystemKey(all, 'food_safety')).toBeUndefined()
  })
  it('finds by name case-insensitively', () => {
    expect(categoryByName(all, 'hvac')?.id).toBe('h')
    expect(categoryByName(all, ' Training ')?.id).toBe('t')
    expect(categoryByName(all, 'nope')).toBeUndefined()
  })
})

describe('defaultsFor', () => {
  it('reads the category defaults', () => {
    expect(defaultsFor(training)).toEqual({ task: true, approval: true })
    expect(defaultsFor(hvac)).toEqual({ task: true, approval: false })
  })
  it('falls back to task-only for an unknown category', () => {
    expect(defaultsFor(undefined)).toEqual({ task: true, approval: false })
  })
})

describe('allowsWorkOrder', () => {
  it('is true only for the maintenance module', () => {
    for (const m of CATEGORY_MODULES) expect(allowsWorkOrder(m)).toBe(m === 'maintenance')
    expect(allowsWorkOrder(undefined)).toBe(false)
  })
})

describe('issueModule', () => {
  it('prefers the module the API sent with the issue', () => {
    expect(issueModule({ category: 'HVAC', categoryModule: 'it_support' }, all)).toBe('it_support')
  })
  it('falls back to the category id, then the name', () => {
    expect(issueModule({ category: 'whatever', categoryId: 'h' }, all)).toBe('maintenance')
    expect(issueModule({ category: 'Perbaikan' }, all)).toBe('maintenance')
  })
  it('is general when the category is unknown', () => {
    expect(issueModule({ category: 'Hilang' }, all)).toBe('general')
  })
})
