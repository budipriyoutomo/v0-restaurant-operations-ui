'use client'

import { useEffect, useState } from 'react'
import { Plus, X, Play, Trash2, CalendarClock, Loader2, Gauge } from 'lucide-react'
import { toast } from 'sonner'
import { useIssueStore } from '@/lib/store'
import { usePermissions } from '@/lib/permissions'
import { CreatePMScheduleInput, PMIntervalType, PMTriggerType } from '@/lib/types'
import { cn } from '@/lib/utils'

const INTERVAL_LABELS: Record<PMIntervalType, string> = {
  days: 'hari',
  weeks: 'minggu',
  months: 'bulan',
}

const EMPTY_FORM: CreatePMScheduleInput = {
  assetId: '',
  name: '',
  triggerType: 'calendar',
  intervalType: 'days',
  intervalValue: 30,
  meterInterval: 500,
  checklist: [],
  leadTimeDays: 0,
  nextDueDate: '',
  assigneeName: '',
  isActive: true,
}

export function PMSchedulePanel() {
  const { assets, pmSchedules, pmLoading, loadPMSchedules, createPMSchedule, deletePMSchedule, updatePMSchedule, runPMGenerator, recordMeterReading } =
    useIssueStore()
  const { can } = usePermissions()

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [form, setForm] = useState<CreatePMScheduleInput>(EMPTY_FORM)
  const [checklistText, setChecklistText] = useState('')
  const [meterAsset, setMeterAsset] = useState('')
  const [meterValue, setMeterValue] = useState('')

  useEffect(() => {
    loadPMSchedules()
  }, [loadPMSchedules])

  function resetForm() {
    setForm(EMPTY_FORM)
    setChecklistText('')
    setShowForm(false)
  }

  const isMeter = form.triggerType === 'meter'

  async function handleSave() {
    if (!form.assetId) return toast.error('Pilih aset dulu')
    if (!form.name.trim()) return toast.error('Nama jadwal wajib diisi')
    if (isMeter) {
      if (!form.meterInterval || form.meterInterval < 1) return toast.error('Interval meter wajib diisi')
    } else if (!form.nextDueDate) {
      return toast.error('Tanggal jatuh tempo pertama wajib diisi')
    }
    setSaving(true)
    try {
      const checklist = checklistText.split('\n').map((s) => s.trim()).filter(Boolean)
      const payload: CreatePMScheduleInput = { ...form, checklist }
      if (isMeter) payload.nextDueDate = null
      await createPMSchedule(payload)
      toast.success('Jadwal PM dibuat')
      resetForm()
    } catch (e) {
      toast.error(String(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleRecordReading() {
    if (!meterAsset) return toast.error('Pilih aset')
    const v = Number(meterValue)
    if (Number.isNaN(v) || v < 0) return toast.error('Nilai meter tidak valid')
    try {
      await recordMeterReading(meterAsset, v)
      toast.success('Pembacaan meter dicatat')
      setMeterValue('')
    } catch (e) {
      toast.error(String(e))
    }
  }

  async function handleRun() {
    setRunning(true)
    try {
      const result = await runPMGenerator()
      if (result.generated > 0) {
        toast.success(`${result.generated} work order preventif dibuat`)
      } else {
        toast.message('Tidak ada jadwal jatuh tempo saat ini')
      }
    } catch (e) {
      toast.error(String(e))
    } finally {
      setRunning(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus jadwal PM "${name}"?`)) return
    try {
      await deletePMSchedule(id)
      toast.success('Jadwal dihapus')
    } catch (e) {
      toast.error(String(e))
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await updatePMSchedule(id, { isActive: !isActive })
    } catch (e) {
      toast.error(String(e))
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">Jadwal Preventive Maintenance</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generator otomatis membuat work order preventif saat jatuh tempo
            </p>
          </div>
        </div>
        {can.managePM && (
          <div className="flex items-center gap-2">
            {can.runPMGenerator && (
              <button
                onClick={handleRun}
                disabled={running}
                className="flex items-center gap-1.5 px-2.5 h-8 rounded-md border border-border text-xs font-semibold hover:bg-accent transition-colors disabled:opacity-50"
              >
                {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                Jalankan sekarang
              </button>
            )}
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 h-8 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              {showForm ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
              {showForm ? 'Tutup' : 'Jadwal baru'}
            </button>
          </div>
        )}
      </div>

      {/* Create form */}
      {showForm && can.managePM && (
        <div className="mb-4 rounded-lg border border-border bg-muted/20 p-3 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-muted-foreground">Aset</span>
              <select
                value={form.assetId}
                onChange={(e) => setForm({ ...form, assetId: e.target.value })}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value="">— pilih aset —</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} · {a.outlet}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-muted-foreground">Nama jadwal</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Servis AC bulanan"
                className="h-8 rounded-md border border-border bg-background px-2 text-xs"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-muted-foreground">Pemicu</span>
              <select
                value={form.triggerType}
                onChange={(e) => setForm({ ...form, triggerType: e.target.value as PMTriggerType })}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value="calendar">Kalender</option>
                <option value="meter">Meter (jam pakai)</option>
              </select>
            </label>

            {isMeter ? (
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-semibold text-muted-foreground">Interval meter (unit)</span>
                <input
                  type="number" min={1}
                  value={form.meterInterval ?? 0}
                  onChange={(e) => setForm({ ...form, meterInterval: Number(e.target.value) })}
                  placeholder="mis. 500 jam"
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                />
              </label>
            ) : (
              <>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-semibold text-muted-foreground">Interval</span>
                  <div className="flex gap-1">
                    <input
                      type="number" min={1}
                      value={form.intervalValue}
                      onChange={(e) => setForm({ ...form, intervalValue: Number(e.target.value) })}
                      className="h-8 w-14 rounded-md border border-border bg-background px-2 text-xs"
                    />
                    <select
                      value={form.intervalType}
                      onChange={(e) => setForm({ ...form, intervalType: e.target.value as PMIntervalType })}
                      className="h-8 flex-1 rounded-md border border-border bg-background px-1 text-xs"
                    >
                      <option value="days">Hari</option>
                      <option value="weeks">Minggu</option>
                      <option value="months">Bulan</option>
                    </select>
                  </div>
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-semibold text-muted-foreground">Jatuh tempo pertama</span>
                  <input
                    type="date"
                    value={form.nextDueDate ?? ''}
                    onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                  />
                </label>
              </>
            )}

            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-muted-foreground">Lead time (hari)</span>
              <input
                type="number"
                min={0}
                value={form.leadTimeDays}
                onChange={(e) => setForm({ ...form, leadTimeDays: Number(e.target.value) })}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-muted-foreground">Penanggung jawab (opsional)</span>
              <input
                value={form.assigneeName ?? ''}
                onChange={(e) => setForm({ ...form, assigneeName: e.target.value })}
                placeholder="Nama teknisi"
                className="h-8 rounded-md border border-border bg-background px-2 text-xs"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-muted-foreground">Checklist (satu baris = satu item)</span>
              <textarea
                value={checklistText}
                onChange={(e) => setChecklistText(e.target.value)}
                rows={2}
                placeholder={'Bersihkan filter\nCek freon'}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-xs resize-y"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={resetForm} className="px-3 h-8 rounded-md border border-border text-xs font-semibold hover:bg-accent transition-colors">
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              Simpan jadwal
            </button>
          </div>
        </div>
      )}

      {/* Meter reading recorder (for meter-based schedules) */}
      {can.managePM && assets.length > 0 && (
        <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/10 p-2.5">
          <Gauge className="size-4 text-primary mb-1.5" />
          <span className="text-xs font-semibold text-muted-foreground mb-1.5">Catat pembacaan meter:</span>
          <select
            value={meterAsset}
            onChange={(e) => setMeterAsset(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="">— aset —</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input
            type="number" min={0} value={meterValue}
            onChange={(e) => setMeterValue(e.target.value)}
            placeholder="nilai meter (mis. jam)"
            className="h-8 w-40 rounded-md border border-border bg-background px-2 text-xs"
          />
          <button
            onClick={handleRecordReading}
            className="px-2.5 h-8 rounded-md border border-border text-xs font-semibold hover:bg-accent transition-colors"
          >
            Catat
          </button>
        </div>
      )}

      {/* Schedule list */}
      {pmLoading ? (
        <p className="text-xs text-muted-foreground text-center py-6">Memuat jadwal…</p>
      ) : pmSchedules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border flex items-center justify-center py-10 text-xs text-muted-foreground">
          Belum ada jadwal PM.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 font-semibold">Jadwal</th>
                <th className="text-left py-2 font-semibold">Aset</th>
                <th className="text-left py-2 font-semibold">Interval</th>
                <th className="text-left py-2 font-semibold">Jatuh tempo</th>
                <th className="text-left py-2 font-semibold">Checklist</th>
                <th className="text-left py-2 font-semibold">Status</th>
                {can.managePM && <th className="py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pmSchedules.map((s) => (
                <tr key={s.id} className="hover:bg-accent/40 transition-colors">
                  <td className="py-2 font-semibold">
                    {s.name}
                    {s.triggerType === 'meter' && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-semibold border bg-primary/10 text-primary border-primary/20">
                        <Gauge className="size-2.5" /> meter
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-muted-foreground">{s.assetName}</td>
                  <td className="py-2 text-muted-foreground">
                    {s.triggerType === 'meter'
                      ? `Tiap ${s.meterInterval} unit`
                      : `Tiap ${s.intervalValue} ${INTERVAL_LABELS[s.intervalType]}`}
                  </td>
                  <td className="py-2 text-muted-foreground">
                    {s.triggerType === 'meter'
                      ? `meter: ${s.lastMeterValue ?? 0}`
                      : (s.nextDueDate ?? '—')}
                  </td>
                  <td className="py-2 text-muted-foreground">{s.checklist.length} item</td>
                  <td className="py-2">
                    <button
                      disabled={!can.managePM}
                      onClick={() => toggleActive(s.id, s.isActive)}
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[11px] font-semibold border',
                        s.isActive
                          ? 'bg-success/15 text-success border-success/30'
                          : 'bg-muted text-muted-foreground border-border',
                        can.managePM && 'hover:opacity-80 cursor-pointer',
                      )}
                    >
                      {s.isActive ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </td>
                  {can.managePM && (
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Hapus jadwal"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
