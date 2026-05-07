import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAnonymousStore } from '../../store/anonymousStore'
import { claimProject } from '../../api/projects'
import { ApiResponseError } from '../../api/client'

export function ClaimPrompt() {
  const navigate = useNavigate()
  const entries = useAnonymousStore((s) => s.entries)
  const removeEntry = useAnonymousStore((s) => s.removeEntry)
  const [claiming, setClaiming] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleClaim(id: string, ownerToken: string) {
    setClaiming((prev) => ({ ...prev, [id]: true }))
    setErrors((prev) => ({ ...prev, [id]: '' }))
    try {
      await claimProject(id, ownerToken)
      removeEntry(id)
    } catch (err) {
      const msg =
        err instanceof ApiResponseError ? err.body.error : 'Failed to claim project'
      setErrors((prev) => ({ ...prev, [id]: msg }))
    } finally {
      setClaiming((prev) => ({ ...prev, [id]: false }))
    }
  }

  useEffect(() => {
    if (entries.length === 0) {
      void navigate('/projects')
    }
  }, [entries.length, navigate])

  function handleSkip(id: string) {
    removeEntry(id)
  }

  if (entries.length === 0) return null

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-gray-900">Claim your projects</h1>
        <p className="mb-6 text-sm text-gray-500">
          You created the following projects before signing in. Add them to your account or skip to
          leave them as public anonymous projects.
        </p>

        <ul className="space-y-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
            >
              <span className="truncate text-sm font-medium text-gray-800">{entry.name}</span>
              <div className="ml-4 flex shrink-0 gap-2">
                <button
                  onClick={() => void handleClaim(entry.id, entry.ownerToken)}
                  disabled={claiming[entry.id]}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {claiming[entry.id] ? 'Claiming…' : 'Claim'}
                </button>
                <button
                  onClick={() => handleSkip(entry.id)}
                  disabled={claiming[entry.id]}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Skip
                </button>
              </div>
              {errors[entry.id] && (
                <p className="mt-1 text-xs text-red-600">{errors[entry.id]}</p>
              )}
            </li>
          ))}
        </ul>

        <button
          onClick={() => void navigate('/projects')}
          className="mt-6 w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Continue to dashboard
        </button>
      </div>
    </div>
  )
}
