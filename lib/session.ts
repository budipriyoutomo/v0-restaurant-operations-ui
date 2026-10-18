// Session restore on app start (Todo-PWA P1). The token is only dropped when
// the server refuses it — a dead network (outlet basement, airplane mode) keeps
// the user signed in on the last known profile, so the app shell, the offline
// bar and the offline queue still work.
import { api, apiStatus, authToken, cachedUser } from './api-client'
import type { User } from './types'

export async function restoreSession(): Promise<User | null> {
  if (!authToken.get()) return null
  try {
    const user = await api.get<User>('/api/auth/me')
    cachedUser.set(user)
    return user
  } catch (e) {
    if (apiStatus(e) === null) return cachedUser.get()    // network: not an answer from the server
    authToken.clear()
    return null
  }
}
