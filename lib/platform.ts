import { translate } from './i18n/translate'
import type { Locale } from './i18n/locale'
// Platform admin — managing customer companies (Todo-Pilot §11).
// Pure helpers; API calls live in platform-api.ts.

export interface NewCompanyForm {
  name: string
  adminName: string
  adminEmail: string
  adminPassword: string   // '' = let the server generate one
  outletName: string      // '' = no first outlet
}

export type NewCompanyErrors = Partial<Record<keyof NewCompanyForm, string>>

/** Same rule as backend platform_service.slugify — preview of the company's slug. */
export function slugify(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug.slice(0, 80) || 'company'
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function validateNewCompany(form: NewCompanyForm, locale: Locale = 'en'): NewCompanyErrors {
  const errors: NewCompanyErrors = {}
  if (!form.name.trim()) errors.name = translate(locale, 'platformRules.name')
  if (!form.adminName.trim()) errors.adminName = translate(locale, 'platformRules.adminName')
  if (!EMAIL.test(form.adminEmail.trim())) errors.adminEmail = translate(locale, 'platformRules.email')
  if (form.adminPassword && form.adminPassword.length < 10) {
    errors.adminPassword = translate(locale, 'platformRules.password')
  }
  return errors
}
