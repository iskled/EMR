import axios from 'axios'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
})

let refreshPromise = null

function getAccessToken() {
  return localStorage.getItem('accessToken')
}

function getRefreshToken() {
  return localStorage.getItem('refreshToken')
}

function clearStoredTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')

  window.dispatchEvent(new Event('auth:logout'))
}

function isAuthEndpoint(url = '') {
  return (
    url.includes('/auth/login/') ||
    url.includes('/auth/refresh/')
  )
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config

    if (
      error.response?.status !== 401 ||
      originalRequest?._retry ||
      isAuthEndpoint(originalRequest?.url)
    ) {
      return Promise.reject(error)
    }

    const refreshToken = getRefreshToken()

    if (!refreshToken) {
      clearStoredTokens()
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      if (!refreshPromise) {
        refreshPromise = axios.post(
          `${API_BASE_URL}/auth/refresh/`,
          { refresh: refreshToken }
        )
      }

      const response = await refreshPromise
      const accessToken = response.data.access

      localStorage.setItem('accessToken', accessToken)

      originalRequest.headers.Authorization = `Bearer ${accessToken}`

      return api(originalRequest)
    } catch (refreshError) {
      clearStoredTokens()
      return Promise.reject(refreshError)
    } finally {
      refreshPromise = null
    }
  }
)

export default api
