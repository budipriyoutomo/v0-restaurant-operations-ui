// Home page per role (Todo-Pilot §19 / UX-6). The role's `home_page` (set in
// Users & Roles) wins; otherwise "Pekerjaan Saya". A home the role cannot open
// falls back too, so nobody lands on "Access denied".
import { canViewPage } from './access'
import type { User } from './types'

export const DEFAULT_HOME = 'my-work'

export function homePage(user: Pick<User, 'permissions'> & { home_page?: string | null }): string {
  const home = user.home_page
  return home && canViewPage(user, home) ? home : DEFAULT_HOME
}
