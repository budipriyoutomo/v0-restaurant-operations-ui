// Training screen rules (Todo-Pilot §9). Pure — tested in training.test.ts.
// Mirrors backend training_service (capacity_error, attendance_error); the
// server stays the authority.
import type { TrainingProgram } from './types'

export function placesLeft(maxParticipants: number | null, enrolled: number): number | null {
  return maxParticipants === null ? null : Math.max(0, maxParticipants - enrolled)
}

/** Why attendance cannot be marked yet (null = it can). `today` is YYYY-MM-DD. */
export function attendanceBlocker(p: Pick<TrainingProgram, 'status' | 'scheduled_date'>, today: string): string | null {
  if (p.status === 'cancelled') return 'The training was cancelled'
  if (p.scheduled_date && p.scheduled_date > today) return `Attendance can be marked from ${p.scheduled_date}`
  return null
}

export function rateLabel(rate: number | null): string {
  return rate === null ? '—' : `${rate}%`
}

/** Active users not yet enrolled, by name; optionally only the program's target role. */
export function enrollCandidates<U extends { id: string; name: string; role: string; is_active: boolean }>(
  users: U[], enrolledUserIds: string[], targetRole: string | null,
): U[] {
  const taken = new Set(enrolledUserIds)
  return users
    .filter((u) => u.is_active && !taken.has(u.id) && (!targetRole || u.role === targetRole))
    .sort((a, b) => a.name.localeCompare(b.name))
}
