export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  if (process.env.NODE_ENV === 'test') return

  const verifyUrl = `${process.env.APP_URL}/verify-email?token=${token}`
  console.log(`[email] verification link for ${to}: ${verifyUrl}`)
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  if (process.env.NODE_ENV === 'test') return

  const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`
  console.log(`[email] password reset link for ${to}: ${resetUrl}`)
}
