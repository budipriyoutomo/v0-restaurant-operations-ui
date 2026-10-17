import { translate } from './i18n/translate'
import type { Locale } from './i18n/locale'
// Password change (Settings → Security) and admin reset (Users page).
// Pure helpers; API calls live in password-api.ts.

/** Same rule as backend auth_service.PASSWORD_MIN_LENGTH. */
export const PASSWORD_MIN_LENGTH = 10

export interface ChangePasswordForm {
  current: string
  next: string
  confirm: string
}

export type ChangePasswordErrors = Partial<Record<keyof ChangePasswordForm, string>>

export function validateChangePassword(form: ChangePasswordForm, locale: Locale = 'en'): ChangePasswordErrors {
  const errors: ChangePasswordErrors = {}
  if (!form.current) errors.current = translate(locale, 'password.currentRequired')
  if (form.next.length < PASSWORD_MIN_LENGTH) errors.next = translate(locale, 'password.minLength')
  else if (form.next === form.current) errors.next = translate(locale, 'password.sameAsCurrent')
  else if (form.confirm !== form.next) errors.confirm = translate(locale, 'password.mismatch')
  return errors
}

/** '' = let the server generate one. Returns the error text, or null when valid. */
export function validateResetPassword(password: string, locale: Locale = 'en'): string | null {
  if (password && password.length < PASSWORD_MIN_LENGTH) return translate(locale, 'password.resetMinLength')
  return null
}

export interface NewPasswordForm {
  next: string
  confirm: string
}

/** The "choose a new password" page opened from the reset email. */
export function validateNewPassword(form: NewPasswordForm, locale: Locale = 'en'): Partial<Record<keyof NewPasswordForm, string>> {
  if (form.next.length < PASSWORD_MIN_LENGTH) return { next: translate(locale, 'password.minLength') }
  if (form.confirm !== form.next) return { confirm: translate(locale, 'password.mismatch') }
  return {}
}

/** Token from the reset link (`/reset-password?token=…`); null when missing. */
export function resetTokenFrom(search: string): string | null {
  return new URLSearchParams(search).get('token') || null
}
