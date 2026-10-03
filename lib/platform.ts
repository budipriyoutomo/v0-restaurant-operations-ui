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

export function validateNewCompany(form: NewCompanyForm): NewCompanyErrors {
  const errors: NewCompanyErrors = {}
  if (!form.name.trim()) errors.name = 'Company name is required'
  if (!form.adminName.trim()) errors.adminName = 'Admin name is required'
  if (!EMAIL.test(form.adminEmail.trim())) errors.adminEmail = 'Enter a valid email address'
  if (form.adminPassword && form.adminPassword.length < 10) {
    errors.adminPassword = 'At least 10 characters, or leave empty to generate one'
  }
  return errors
}
