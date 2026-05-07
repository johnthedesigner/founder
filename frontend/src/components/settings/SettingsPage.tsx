import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUserStore } from '../../store/userStore'
import { CliTokenSection } from './CliTokenSection'

export function SettingsPage() {
  const { user, isLoading, fetchUser } = useUserStore()
  const navigate = useNavigate()

  useEffect(() => {
    void fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (!isLoading && user === null) {
      void navigate('/login')
    }
  }, [isLoading, user, navigate])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <Link
            to="/projects"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Projects
          </Link>
          <h1 className="text-base font-semibold text-gray-900">Settings</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <CliTokenSection />
      </main>
    </div>
  )
}
