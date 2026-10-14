// GET /api/onboarding — what a new company still has to set up (Todo-Pilot §24 / UX-11).
import { api } from './api-client'

export type OnboardingStepKey = 'outlets' | 'users' | 'masterData' | 'assets' | 'pm' | 'approvalPolicy'

export interface Onboarding {
  steps: { key: OnboardingStepKey; done: boolean; count: number }[]
  complete: boolean
  demoAvailable: boolean
  dismissed: boolean
}

export const onboardingApi = {
  get: () => api.get<Onboarding>('/api/onboarding'),
  createDemoData: () => api.post<{ issues: string[]; asset: string; outlet: string }>('/api/onboarding/demo-data', {}),
  dismiss: () => api.patch('/api/auth/me/preferences', { preferences: { onboardingDismissed: true } }),
}

/** Where each step is done in the app. */
export const STEP_PAGE: Record<OnboardingStepKey, string> = {
  outlets: 'master-data',
  users: 'users',
  masterData: 'master-data',
  assets: 'cmms',
  pm: 'cmms',
  approvalPolicy: 'master-data',
}
