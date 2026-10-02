// Training screen rules (Todo-Pilot §9). Written first (TDD); mirror
// backend/app/services/training_service.py (capacity_error, attendance_error).
import { describe, expect, it } from 'vitest'
import { attendanceBlocker, enrollCandidates, placesLeft, rateLabel } from './training'

describe('placesLeft', () => {
  it('is null when unlimited', () => expect(placesLeft(null, 10)).toBeNull())
  it('never goes below zero', () => {
    expect(placesLeft(10, 7)).toBe(3)
    expect(placesLeft(5, 5)).toBe(0)
  })
})

describe('attendanceBlocker', () => {
  const today = '2026-10-03'
  it('allows on or after the training day', () => {
    expect(attendanceBlocker({ status: 'scheduled', scheduled_date: '2026-10-03' }, today)).toBeNull()
    expect(attendanceBlocker({ status: 'completed', scheduled_date: '2026-09-01' }, today)).toBeNull()
    expect(attendanceBlocker({ status: 'ongoing', scheduled_date: null }, today)).toBeNull()
  })
  it('blocks before the day and for cancelled trainings', () => {
    expect(attendanceBlocker({ status: 'scheduled', scheduled_date: '2026-10-04' }, today))
      .toBe('Attendance can be marked from 2026-10-04')
    expect(attendanceBlocker({ status: 'cancelled', scheduled_date: null }, today)).toBe('The training was cancelled')
  })
})

describe('rateLabel', () => {
  it('formats', () => {
    expect(rateLabel(66.7)).toBe('66.7%')
    expect(rateLabel(null)).toBe('—')
  })
})

describe('enrollCandidates', () => {
  const users = [
    { id: '1', name: 'Budi', role: 'staff', is_active: true },
    { id: '2', name: 'Ani', role: 'staff', is_active: true },
    { id: '3', name: 'Citra', role: 'manager', is_active: true },
    { id: '4', name: 'Dodi', role: 'staff', is_active: false },
  ]
  it('excludes enrolled and inactive users, sorted by name', () => {
    expect(enrollCandidates(users, ['1'], null).map((u) => u.name)).toEqual(['Ani', 'Citra'])
  })
  it('can narrow to the target role', () => {
    expect(enrollCandidates(users, [], 'staff').map((u) => u.name)).toEqual(['Ani', 'Budi'])
  })
})
