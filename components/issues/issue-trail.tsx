'use client'

// "Jalur Penanganan" on the issue detail (Todo-Modern-UI Fase 3): one ticket per
// task, approval and work order, each with its own status and owner.
import type { TrailStep } from '@/lib/issue-trail'
import { navigate } from '@/lib/use-route'
import { useT, type MessageKey } from '@/lib/i18n'
import { RecordId } from '@/components/shared/record-id'
import { RailTicket, ServiceRail } from '@/components/shared/service-rail'

const STATUS_GROUP = { task: 'status', workOrder: 'woStatus', approval: 'approvalStatus' } as const

export function IssueTrail({ steps }: { steps: TrailStep[] }) {
  const { t, label } = useT()
  if (steps.length === 0) return null

  const who = (s: TrailStep) => {
    if (s.kind === 'approval') {
      if (s.step === null) return null
      return s.ownerRole
        ? t('issueDrawer.trailApprovalTurn', { step: s.step, steps: s.steps ?? s.step, role: label('tier', s.ownerRole) })
        : t('issueDrawer.trailApprovalStep', { step: s.step, steps: s.steps ?? s.step })
    }
    if (s.title === null && s.owner === null) return null           // summary only: owner not visible to this role
    return s.owner && s.owner !== 'Unassigned' ? t('issueDrawer.trailOwner', { name: s.owner }) : t('issueDrawer.trailNoOwner')
  }

  return (
    <div className="space-y-2">
    <h3 className="text-sm font-semibold" aria-hidden="true">{t('issueDrawer.trail')}</h3>
    <ServiceRail label={t('issueDrawer.trail')}>
      {steps.map((s) => (
        <RailTicket key={s.key} signal={s.done ? 'done' : s.signal}
          status={label(STATUS_GROUP[s.kind], s.status)}
          title={s.title ?? t(`myWork.kind.${s.kind}` as MessageKey)}
          meta={<><span>{t(`myWork.kind.${s.kind}` as MessageKey)} · </span><RecordId id={s.number} />{who(s) && <span className="block mt-0.5">{who(s)}</span>}</>}
          onClick={s.to ? () => navigate(s.to!) : undefined} />
      ))}
    </ServiceRail>
    </div>
  )
}
