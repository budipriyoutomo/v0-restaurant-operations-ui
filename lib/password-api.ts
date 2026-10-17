// Password REST calls: change my own, admin reset, forgot password by email.
import { api, authToken } from './api-client'

export const passwordApi = {
  /** Signs out every other session; this device keeps working with the new token. */
  changeOwn: async (current: string, next: string) => {
    const { access_token } = await api.post<{ access_token: string }>(
      '/api/auth/me/password', { current_password: current, new_password: next })
    authToken.set(access_token)
  },
  /** `password` empty = server generates one and returns it (shown once). */
  reset: (userId: string, password: string) =>
    api.post<{ password: string | null }>(`/api/auth/users/${userId}/reset-password`,
      password ? { password } : {}),
  /** Always succeeds (202) whether or not the account exists. */
  forgot: (email: string) => api.post<void>('/api/auth/forgot-password', { email: email.trim() }),
  resetWithToken: (token: string, next: string) =>
    api.post<void>('/api/auth/reset-password', { token, new_password: next }),
}
