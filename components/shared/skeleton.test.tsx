import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppShellSkeleton, ListSkeleton, RowsSkeleton } from './skeleton'

describe('ListSkeleton', () => {
  it('is announced once as loading, with the placeholders hidden from screen readers', () => {
    const { container } = render(<ListSkeleton rows={3} />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(4)
  })
})

// Todo-Modern-UI Fase 4: no bare "Loading…" text — placeholders shaped like the content.
describe('RowsSkeleton', () => {
  it('shows row placeholders and says what is loading to screen readers only', () => {
    const { container } = render(<RowsSkeleton rows={2} label="Loading inventory…" />)
    const status = screen.getByRole('status', { name: 'Loading inventory…' })
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2)
    expect(screen.getByText('Loading inventory…')).toHaveClass('sr-only')
  })
})

describe('AppShellSkeleton', () => {
  it('draws the app frame — sidebar, top bar, content — while the session is restored', () => {
    render(<AppShellSkeleton />)
    const status = screen.getByRole('status', { name: 'Loading…' })
    expect(status.querySelector('[data-part="sidebar"]')).not.toBeNull()
    expect(status.querySelector('[data-part="header"]')).not.toBeNull()
    expect(status.querySelector('[data-part="content"]')).not.toBeNull()
  })
})

describe('loading text', () => {
  it('is never shown on its own as a paragraph', () => {
    const root = path.resolve(__dirname, '../..')
    const bare = /<p[^>]*>\s*\{t\('[\w.]+\.loading'\)\}\s*<\/p>/
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const n of readdirSync(dir)) {
        const p = path.join(dir, n)
        if (statSync(p).isDirectory()) { if (n !== 'node_modules') walk(p) }
        else if (/\.tsx$/.test(n) && !n.includes('.test.') && bare.test(readFileSync(p, 'utf8'))) offenders.push(path.relative(root, p))
      }
    }
    for (const dir of ['app', 'components']) walk(path.join(root, dir))
    expect(offenders).toEqual([])
  })

  it('the first screen after a reload is the app frame, not a bare word', () => {
    const page = readFileSync(path.resolve(__dirname, '../../app/[[...slug]]/page.tsx'), 'utf8')
    expect(page).toContain('<AppShellSkeleton')
    expect(page).not.toMatch(/h-screen[^>]*>\s*\{t\('common\.loading'\)\}/)
  })
})
