// Shared empty state (Todo-UI 0.4). Written first (TDD).
import { render, screen } from '@testing-library/react'
import { Inbox } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './empty-state'

describe('EmptyState', () => {
  it('is a status named by its title, with the hint and the next step', () => {
    render(<EmptyState icon={Inbox} title="No issues yet" description="Report the first one." action={<button>Create</button>} />)
    const status = screen.getByRole('status', { name: 'No issues yet' })
    expect(status).toHaveTextContent('Report the first one.')
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })

  it('works with a title only', () => {
    render(<EmptyState title="Nothing here" />)
    expect(screen.getByRole('status', { name: 'Nothing here' })).toBeInTheDocument()
  })

  it('takes a ready-made icon element too', () => {
    render(<EmptyState icon={<Inbox data-testid="icon" />} title="Nothing here" />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })
})
