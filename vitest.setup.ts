// React Testing Library setup for the `dom` Vitest project.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())

// Component tests assert English labels; the Indonesian default is covered by
// lib/i18n tests and the E2E suite (Todo-Pilot §16).
import { beforeEach } from 'vitest'
import { useIssueStore } from '@/lib/store'
beforeEach(() => useIssueStore.setState?.({ locale: 'en' }))   // ?. — some tests mock the store
