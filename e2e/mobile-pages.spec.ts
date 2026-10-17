// End-to-end: every page and tab fits a phone (360px).
//
//   No sideways scroll, no text under 12px, and every button, link and field
//   is at least 36px tall and 32px wide (Todo-UI: mobile friendly). Screenshots
//   and the full report land in test-results/audit for a visual check.
//
// Runs against the isolated stack in playwright.config.ts (fresh seeded DB).
import { expect, test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const PAGES = ['my-work', 'dashboard', 'issues', 'it-support', 'tasks', 'approvals', 'ops', 'maintenance', 'cmms',
  'assets', 'procurement', 'training', 'marketing', 'qa', 'guest-service', 'analytics', 'reports', 'master-data', 'notifications',
  'users', 'settings']
const PHONE = { width: 360, height: 740 }
const OUT = 'test-results/audit'

test.use({ viewport: PHONE, hasTouch: true, isMobile: true })
test.setTimeout(600_000)

test('every page and tab fits a 360px phone', async ({ page }) => {
  mkdirSync(OUT, { recursive: true })
  await page.goto('/my-work')
  await page.getByLabel('Email').fill('admin@restaurant.com')
  await page.getByLabel('Password', { exact: true }).fill('admin123')
  await page.getByRole('button', { name: /^masuk$/i }).click()
  await page.waitForTimeout(3000)

  const report: Record<string, Audit> = {}
  const audit = async (name: string) => {
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${OUT}/${name}.png` })
    report[name] = await page.evaluate(() => {
      const vw = window.innerWidth
      const desc = (el: Element) => {
        const txt = (el.getAttribute('aria-label') || (el as HTMLElement).innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40)
        return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${txt}"`
      }
      const clipped = (el: Element) => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          const ox = getComputedStyle(p).overflowX
          if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return true
        }
        return false
      }
      const visible = (el: Element) => {
        const r = el.getBoundingClientRect(); const s = getComputedStyle(el)
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('.sr-only')
      }
      const overflow = document.documentElement.scrollWidth - vw
      const wide = [...document.querySelectorAll('main *')].filter((el) => visible(el) && el.getBoundingClientRect().right > vw + 1 && !clipped(el))
        .slice(0, 8).map((el) => `${desc(el)} right=${Math.round(el.getBoundingClientRect().right)}`)
      const small = [...document.querySelectorAll('main button, main a[href], main input:not([type=hidden]), main select, main [role=tab], main [role=checkbox], main [role=switch]')]
        .filter((el) => {
          if (!visible(el) || el.classList.contains('sr-only')) return false
          const r = el.getBoundingClientRect()
          const t = (el as HTMLInputElement).type
          if (t === 'checkbox' || t === 'radio') return false
          // Links inside a line of text are exempt (WCAG 2.5.8 "inline")
          if (el.tagName === 'A' && getComputedStyle(el).display === 'inline') return false
          return r.height < 36 || r.width < 32
        })
        .map((el) => { const r = el.getBoundingClientRect(); return `${desc(el)} ${Math.round(r.width)}x${Math.round(r.height)}` })
      const tiny = new Set<string>()
      document.querySelectorAll('main *').forEach((el) => {
        if (!visible(el)) return
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())
        if (own && parseFloat(getComputedStyle(el).fontSize) < 12) tiny.add(`${desc(el)} ${getComputedStyle(el).fontSize}`)
      })
      return { overflow, wide, small: [...new Set(small)].slice(0, 25), smallCount: small.length, tiny: [...tiny].slice(0, 10) }
    })
  }
  for (const id of PAGES) {
    await page.goto(`/${id}`)
    await page.waitForTimeout(700)
    await audit(id)
    const tabs = page.locator('main [role=tab]')
    for (let i = 1; i < await tabs.count(); i++) {
      await tabs.nth(i).click()
      await audit(`${id}-tab${i}`)
    }
  }
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))

  const problems = Object.entries(report).flatMap(([name, r]) => [
    ...(r.overflow > 0 ? [`${name}: page scrolls sideways by ${r.overflow}px (${r.wide.join('; ')})`] : []),
    ...r.small.map((s) => `${name}: small target ${s}`),
    ...r.tiny.map((s) => `${name}: tiny text ${s}`),
  ])
  expect(problems, problems.join('\n')).toEqual([])
})

interface Audit { overflow: number; wide: string[]; small: string[]; smallCount: number; tiny: string[] }

