// One select for kanban and forms (Todo-Modern-UI Fase 1). Written first (TDD).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { Select } from './select'

describe('Select', () => {
  it('is a native select with the shared look, labelled and controllable', async () => {
    const onChange = vi.fn()
    render(
      <label>Outlet
        <Select value="a" onChange={(e) => onChange(e.target.value)}>
          <option value="a">Kemang</option>
          <option value="b">Senopati</option>
        </Select>
      </label>,
    )
    const select = screen.getByRole('combobox', { name: /outlet/i })
    expect(select).toHaveClass('border-input', 'rounded-md', 'appearance-none')
    await userEvent.selectOptions(select, 'b')
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('passes className and disabled through', () => {
    render(<Select aria-label="x" className="w-40" disabled><option>1</option></Select>)
    const select = screen.getByRole('combobox', { name: 'x' })
    expect(select).toBeDisabled()
    expect(select.parentElement).toHaveClass('w-40')
  })

  it('has a compact size for kanban cards and table rows', () => {
    render(<Select aria-label="s" size="sm"><option>1</option></Select>)
    expect(screen.getByRole('combobox', { name: 's' })).toHaveClass('h-10', 'sm:h-8', 'text-xs')   // thumb-sized on phones
  })

  it('defaults to the form size', () => {
    render(<Select aria-label="m"><option>1</option></Select>)
    expect(screen.getByRole('combobox', { name: 'm' })).toHaveClass('h-10', 'text-sm')
  })
})

// Todo-Modern-UI Fase 4: every select in kanban boards and forms is the shared one.
describe('native selects', () => {
  it('are only written inside shared/select.tsx', () => {
    const root = path.resolve(__dirname, '../..')
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const n of readdirSync(dir)) {
        const p = path.join(dir, n)
        if (statSync(p).isDirectory()) { if (n !== 'node_modules') walk(p) }
        else if (/\.tsx$/.test(n) && !n.includes('.test.') && /<select[\s>]/.test(readFileSync(p, 'utf8'))) offenders.push(path.relative(root, p))
      }
    }
    for (const dir of ['app', 'components']) walk(path.join(root, dir))
    expect(offenders).toEqual(['components/shared/select.tsx'])
  })
})
