// One page header for every page. Written first (TDD).
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageHeader } from './page-header'

describe('PageHeader', () => {
  it('renders the page title, description and actions', () => {
    render(<PageHeader title="Laporan" description="Semua laporan" actions={<button>Baru</button>} />)
    expect(screen.getByRole('heading', { name: 'Laporan', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Semua laporan')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Baru' })).toBeInTheDocument()
  })
})
