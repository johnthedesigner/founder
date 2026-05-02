export interface UserRow {
  id: string
  email: string
  password_hash: string
  display_name: string
  email_verified: boolean
  deleted_at: Date | null
  created_at: Date
}

export interface UserSessionRow {
  id: string
  user_id: string
  jti: string
  device_hint: string | null
  ip_address: string | null
  last_active_at: Date
  created_at: Date
}

export interface EmailVerificationTokenRow {
  id: string
  user_id: string
  token: string
  expires_at: Date
  used_at: Date | null
}

export interface PasswordResetTokenRow {
  id: string
  user_id: string
  token: string
  expires_at: Date
  used_at: Date | null
}

export interface ProjectRow {
  id: string
  user_id: string
  name: string
  slug: string
  config: Record<string, unknown>
  last_exported_at: Date | null
  created_at: Date
  updated_at: Date
}
