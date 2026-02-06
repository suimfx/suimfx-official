import { API_URL } from '../config/api'

/**
 * Get authorization headers for admin API calls
 * Redirects to login if no token found
 */
export const getAdminHeaders = () => {
  const token = localStorage.getItem('adminToken')
  if (!token) {
    console.warn('[AdminAPI] No admin token found, redirecting to login')
    window.location.href = '/admin'
    return { 'Content-Type': 'application/json' }
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

/**
 * Make authenticated admin API request
 */
export const adminFetch = async (endpoint, options = {}) => {
  const headers = getAdminHeaders()
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  })
  return response
}

export default { getAdminHeaders, adminFetch }
