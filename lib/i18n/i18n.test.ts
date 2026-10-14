import { describe, expect, it } from 'vitest'
import { en } from './en'
import { id } from './id'
import { DEFAULT_LOCALE, enumLabel, formatDate, formatRelative, normalizeLocale, translate } from './index'

// Todo-Pilot §16 (UX-3): one interface language, every string in a dictionary.

function leaves(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'string' ? [`${prefix}${k}`] : leaves(v as object, `${prefix}${k}.`))
}

describe('dictionaries', () => {
  it('Indonesian is the default', () => {
    expect(DEFAULT_LOCALE).toBe('id')
  })

  it('English has exactly the Indonesian keys and no empty text', () => {
    expect(leaves(en).sort()).toEqual(leaves(id).sort())
    for (const [dict, name] of [[id, 'id'], [en, 'en']] as const) {
      for (const k of leaves(dict)) {
        const v = k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], dict)
        expect(String(v).trim(), `${name}:${k}`).not.toBe('')
      }
    }
  })

  it('uses the glossary', () => {
    expect(translate('id', 'nav.issues')).toBe('Laporan')
    expect(translate('id', 'nav.approvals')).toBe('Persetujuan')
    expect(translate('id', 'nav.tasks')).toBe('Tugas')
    expect(translate('id', 'term.workOrder')).toBe('Perintah Kerja')
  })
})

describe('translate', () => {
  it('fills {placeholders}', () => {
    expect(translate('en', 'issues.closeAll', { count: 3 })).toBe('Close all 3')
    expect(translate('id', 'issues.closeAll', { count: 3 })).toBe('Tutup semua (3)')
  })

  it('falls back to the key for an unknown key instead of crashing', () => {
    expect(translate('id', 'nope.missing' as never)).toBe('nope.missing')
  })
})

describe('enumLabel', () => {
  it('labels API enum values in the chosen language', () => {
    expect(enumLabel('id', 'status', 'in-progress')).toBe('Dikerjakan')
    expect(enumLabel('en', 'status', 'in-progress')).toBe('In progress')
    expect(enumLabel('id', 'priority', 'critical')).toBe('Kritis')
  })

  it('shows an unknown value as is', () => {
    expect(enumLabel('id', 'status', 'mystery')).toBe('mystery')
  })
})

describe('locale helpers', () => {
  it('normalizes stored values', () => {
    expect(normalizeLocale('en')).toBe('en')
    expect(normalizeLocale('id')).toBe('id')
    expect(normalizeLocale('fr')).toBe('id')
    expect(normalizeLocale(null)).toBe('id')
  })

  it('formats dates per language', () => {
    expect(formatDate('id', '2026-10-13')).toBe('13 Okt 2026')
    expect(formatDate('en', '2026-10-13')).toBe('13 Oct 2026')
    expect(formatDate('id', null)).toBe('—')
  })

  it('formats relative times', () => {
    const now = new Date('2026-10-13T12:00:00Z').getTime()
    expect(formatRelative('id', '2026-10-13T11:59:40Z', now)).toBe('baru saja')
    expect(formatRelative('id', '2026-10-13T11:55:00Z', now)).toBe('5 menit lalu')
    expect(formatRelative('id', '2026-10-13T09:00:00Z', now)).toBe('3 jam lalu')
    expect(formatRelative('en', '2026-10-11T12:00:00Z', now)).toBe('2 days ago')
  })
})
