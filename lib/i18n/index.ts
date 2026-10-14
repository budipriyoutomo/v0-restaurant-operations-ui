// Interface language (Todo-Pilot §16 / UX-3).
//
// Every UI string lives in a dictionary: lib/i18n/id.ts is the source of keys,
// other languages must have exactly the same shape (TypeScript enforces it, and
// lib/i18n/i18n.test.ts checks no key is missing or empty). Adding a language =
// adding a file and listing it in DICTIONARIES. API enum values stay English;
// only their labels are translated (enumLabel).
//
// Glossary (id): Issue = Laporan · Task = Tugas · Work Order = Perintah Kerja
// (WO) · Approval = Persetujuan · Asset = Aset · Outlet = Outlet ·
// Preventive Maintenance = Perawatan Berkala · Purchase Request = Permintaan
// Pembelian (PR) · Purchase Order = Pesanan Pembelian (PO).
import { useCallback } from 'react'
import { useIssueStore } from '@/lib/store'
import {
  enumLabel, formatDate, formatDateTime, formatRelative, statusLabel, translate,
  type EnumGroup, type MessageKey, type Vars,
} from './translate'

export * from './translate'

/** t(key, vars) bound to the current user's language, plus formatting helpers. */
export function useT() {
  const locale = useIssueStore((s) => s.locale)
  const t = useCallback((key: MessageKey, vars?: Vars) => translate(locale, key, vars), [locale])
  const label = useCallback((group: EnumGroup, value: string) => enumLabel(locale, group, value), [locale])
  const status = useCallback((value: string) => statusLabel(locale, value), [locale])
  const date = useCallback((v: string | null | undefined) => formatDate(locale, v), [locale])
  const dateTime = useCallback((v: string | null | undefined) => formatDateTime(locale, v), [locale])
  const relative = useCallback((iso: string) => formatRelative(locale, iso), [locale])
  return { t, label, status, date, dateTime, relative, locale }
}
