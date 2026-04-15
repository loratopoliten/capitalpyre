import { createSlice } from '@reduxjs/toolkit'

/**
 * Remember Me logic:
 * - remember = true  → localStorage   (survives browser close)
 * - remember = false → sessionStorage (cleared on tab/browser close)
 */
const readStorage = () => {
  try {
    return (
      JSON.parse(localStorage.getItem('cp_auth')) ||
      JSON.parse(sessionStorage.getItem('cp_auth')) ||
      {}
    )
  } catch { return {} }
}

const stored = readStorage()

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user:       stored.user       || null,
    token:      stored.token      || null,
    remembered: stored.remembered ?? false,
  },
  reducers: {
    setCredentials(state, { payload }) {
      const { user, token, remember = false } = payload
      state.user       = user
      state.token      = token
      state.remembered = remember

      const data = JSON.stringify({ user, token, remembered: remember })

      if (remember) {
        localStorage.setItem('cp_auth', data)
        sessionStorage.removeItem('cp_auth')
      } else {
        sessionStorage.setItem('cp_auth', data)
        localStorage.removeItem('cp_auth')
      }
    },

    logout(state) {
      state.user       = null
      state.token      = null
      state.remembered = false
      localStorage.removeItem('cp_auth')
      sessionStorage.removeItem('cp_auth')
    },

    updateUser(state, { payload }) {
      state.user = { ...state.user, ...payload }
      const data = JSON.stringify({ user: state.user, token: state.token, remembered: state.remembered })
      if (state.remembered) localStorage.setItem('cp_auth', data)
      else sessionStorage.setItem('cp_auth', data)
    },
  },
})

export const { setCredentials, logout, updateUser } = authSlice.actions
export const selectUser       = s => s.auth.user
export const selectToken      = s => s.auth.token
export const selectRole       = s => s.auth.user?.role
export const selectRemembered = s => s.auth.remembered
export default authSlice.reducer
