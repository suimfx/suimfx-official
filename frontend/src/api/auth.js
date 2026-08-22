import { API_URL as BASE_API_URL } from '../config/api'

const API_URL = `${BASE_API_URL}/auth`

export const signup = async (userData) => {
  const response = await fetch(`${API_URL}/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Signup failed')
  }
  return data
}

export const login = async (credentials) => {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Login failed')
  }
  return data
}

export const verify2faLogin = async (email, otp) => {
  const response = await fetch(`${API_URL}/verify-2fa-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, otp }),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Verification failed')
  }
  return data
}

export const getCurrentUser = async (token) => {
  const response = await fetch(`${API_URL}/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Failed to get user')
  }
  return data
}
