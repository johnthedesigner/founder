import { apiRequest } from './client'

export interface User {
  id: string
  email: string
  displayName: string
}

export async function login(email: string, password: string): Promise<{ user: User }> {
  return apiRequest('POST', '/auth/login', { email, password })
}

export async function register(
  email: string,
  password: string,
  displayName: string,
): Promise<void> {
  return apiRequest('POST', '/auth/register', { email, password, displayName })
}

export async function logout(): Promise<void> {
  return apiRequest('POST', '/auth/logout')
}

export async function getMe(): Promise<{ user: User }> {
  return apiRequest('GET', '/auth/me')
}

export async function getCliToken(): Promise<{ token: string }> {
  return apiRequest('GET', '/auth/cli-token')
}

export async function revokeCliToken(): Promise<void> {
  return apiRequest('DELETE', '/auth/cli-token')
}
