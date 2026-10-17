'use client'

// Participants of one training program: enroll (bulk, capacity-checked),
// mark attended / no-show, score (Todo-Pilot §9).
import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, Minus, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { api, apiErrorMessage } from '@/lib/api-client'
import { useIssueStore } from '@/lib/store'
import { attendanceBlocker, enrollCandidates, placesLeft } from '@/lib/training'
import { useT } from '@/lib/i18n'
import type { EnrollmentStatus, TrainingEnrollment, TrainingProgram } from '@/lib/types'
import { SideDrawer } from '@/components/shared/side-drawer'

const base = (id: string) => `/api/training-programs/${id}/enrollments`

export function ParticipantsDrawer({ program, canManage, onClose, onChanged }: {
  program: TrainingProgram
  canManage: boolean
  onClose: () => void
  onChanged: () => void        // program counts changed
}) {
  const { t, label, date, locale } = useT()
  const allUsers = useIssueStore((s) => s.allUsers)
  const [rows, setRows] = useState<TrainingEnrollment[] | null>(null)
  const [picking, setPicking] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [onlyTargetRole, setOnlyTargetRole] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = () => api.get<TrainingEnrollment[]>(base(program.id)).then(setRows).catch((e) => toast.error(apiErrorMessage(e)))
  useEffect(() => { load() }, [program.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const today = new Date().toISOString().slice(0, 10)
  const blocker = attendanceBlocker(program, today, locale)
  const left = placesLeft(program.max_participants, rows?.length ?? program.enrolled_count)
  const candidates = useMemo(
    () => enrollCandidates(allUsers, (rows ?? []).map((r) => r.user_id), onlyTargetRole ? program.target_role : null),
    [allUsers, rows, onlyTargetRole, program.target_role],
  )

  const enroll = async () => {
    setBusy(true)
    try {
      await api.post(base(program.id), { user_ids: selected })
      toast.success(t('participants.enrolled', { count: selected.length }))
      setSelected([]); setPicking(false)
      await load(); onChanged()
    } catch (e) {
      toast.error(apiErrorMessage(e))        // e.g. "Only 2 of 10 places left"
    } finally {
      setBusy(false)
    }
  }

  const patch = async (r: TrainingEnrollment, body: { status?: EnrollmentStatus; score?: number | null; notes?: string }) => {
    try {
      const updated = await api.patch<TrainingEnrollment>(`${base(program.id)}/${r.id}`, body)
      setRows((xs) => xs && xs.map((x) => x.id === r.id ? updated : x))
      onChanged()
    } catch (e) {
      toast.error(apiErrorMessage(e))
    }
  }

  const remove = async (r: TrainingEnrollment) => {
    try {
      await api.delete(`${base(program.id)}/${r.id}`)
      setRows((xs) => xs && xs.filter((x) => x.id !== r.id))
      onChanged()
    } catch (e) {
      toast.error(apiErrorMessage(e))
    }
  }

  return (
    <SideDrawer
      label={`${t('term.participants')}: ${program.title}`}
      title={program.title}
      subtitle={<>
        {program.scheduled_date ? date(program.scheduled_date) : t('participants.noDate')} · {program.outlet ?? t('participants.allOutlets')} · {t('participants.enrolledCount', { count: rows?.length ?? '…', max: program.max_participants ? ` / ${program.max_participants}` : '' })}
        {left !== null && t('participants.placesLeft', { count: left })}
      </>}
      closeLabel={t('common.close')}
      onClose={onClose}
      className="sm:w-[520px]"
    >
          {canManage && !picking && program.status !== 'cancelled' && program.status !== 'completed' && (
            <button onClick={() => setPicking(true)} disabled={left === 0}
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
              <UserPlus className="size-4" /> {left === 0 ? t('participants.full') : t('participants.enroll')}
            </button>
          )}

          {picking && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={onlyTargetRole} onChange={(e) => setOnlyTargetRole(e.target.checked)} />
                {t('participants.onlyRole')} <b>{program.target_role === 'all' ? t('training.allRoles') : label('tier', program.target_role)}</b>
              </label>
              {allUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('participants.cannotList')}</p>
              ) : candidates.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('participants.allEnrolled')}</p>
              ) : (
                <div className="max-h-56 overflow-y-auto divide-y divide-border border border-border rounded-md">
                  {candidates.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-muted/40">
                      <input type="checkbox" checked={selected.includes(u.id)}
                        onChange={(e) => setSelected((s) => e.target.checked ? [...s, u.id] : s.filter((x) => x !== u.id))} />
                      <span className="flex-1">{u.name}</span>
                      <span className="text-xs text-muted-foreground">{u.role_name}</span>
                    </label>
                  ))}
                </div>
              )}
              {left !== null && selected.length > left && (
                <p className="text-xs text-destructive">{t('participants.tooMany', { left, selected: selected.length })}</p>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={() => { setPicking(false); setSelected([]) }} className="px-3 h-9 rounded-lg border border-border text-xs">{t('common.cancel')}</button>
                <button onClick={enroll} disabled={busy || selected.length === 0 || (left !== null && selected.length > left)}
                  className="px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                  {busy ? t('participants.enrolling') : t('participants.enrollN', { count: selected.length || '' })}
                </button>
              </div>
            </div>
          )}

          {blocker && rows && rows.length > 0 && (
            <p className="text-xs text-muted-foreground">{blocker}.</p>
          )}

          {rows === null ? <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin" /></div>
            : rows.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">{t('participants.none')}</p>
            : (
              <div className="space-y-2">
                {rows.map((r) => (
                  <div key={r.id} className="p-3 rounded-lg border border-border space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{r.user_name}</p>
                        <p className="text-xs text-muted-foreground">{r.role_name} · {r.outlet}</p>
                      </div>
                      {canManage && r.status === 'registered' && (
                        <button onClick={() => remove(r)} className="text-xs text-muted-foreground hover:text-destructive">{t('participants.remove')}</button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {(['attended', 'no-show'] as EnrollmentStatus[]).map((s) => {
                        const active = r.status === s
                        return (
                          <button key={s} disabled={!canManage || !!blocker}
                            onClick={() => patch(r, { status: active ? 'registered' : s })}
                            className={cn('flex-1 h-9 rounded-md border text-xs font-semibold flex items-center justify-center gap-1',
                              active ? (s === 'attended' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-600 text-white border-red-600')
                                : 'border-border hover:bg-muted/50', (!canManage || blocker) && !active && 'opacity-40')}>
                            {s === 'attended' ? <Check className="size-3.5" /> : <Minus className="size-3.5" />}
                            {label('enrollmentStatus', s)}
                          </button>
                        )
                      })}
                      {r.status === 'attended' && (
                        <input type="number" min={0} max={100} defaultValue={r.score ?? ''} disabled={!canManage} placeholder={t('participants.score')} aria-label={t('participants.score')}
                          onBlur={(e) => {
                            const v = e.target.value === '' ? null : Math.max(0, Math.min(100, Math.round(Number(e.target.value))))
                            if (v !== r.score) patch(r, { score: v })
                          }}
                          className="w-20 h-9 px-2 rounded-lg border border-border bg-background text-sm" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
    </SideDrawer>
  )
}
