import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function isTokenExpired(token) {
  if (!token) {
    return true
  }

  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(base64Url.length / 4) * 4, '=')
    const payload = JSON.parse(atob(base64))
    const expiryMs = payload.exp * 1000

    return Number.isNaN(expiryMs) || expiryMs <= Date.now()
  } catch {
    return true
  }
}

function clearStoredTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(true)

  const logout = useCallback(() => {
    clearStoredTokens()
    setUser(null)
  }, [])

  const restoreProfile = useCallback(async () => {
    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')

    if (!accessToken && !refreshToken) {
      setUser(null)
      setInitializing(false)
      return
    }

    try {
      const response = await api.get('/auth/profile/')
      setUser(response.data)
    } catch {
      logout()
    } finally {
      setInitializing(false)
    }
  }, [logout])

  useEffect(() => {
    restoreProfile()
  }, [restoreProfile])

  useEffect(() => {
    window.addEventListener('auth:logout', logout)

    return () => {
      window.removeEventListener('auth:logout', logout)
    }
  }, [logout])

  const login = async (email, password) => {
    const response = await api.post('/auth/login/', {
      email,
      password,
    })

    localStorage.setItem('accessToken', response.data.access)
    localStorage.setItem('refreshToken', response.data.refresh)

    setUser(response.data.user)

    return response.data
  }

  const value = useMemo(
    () => ({
      user,
      initializing,
      login,
      logout,
      restoreProfile,
      isAuthenticated: Boolean(user),
    }),
    [user, initializing, logout, restoreProfile]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
