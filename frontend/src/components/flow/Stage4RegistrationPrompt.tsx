import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { register } from '../../api/auth'

type State = 'teaser' | 'form' | 'submitting' | 'success'

export function Stage4RegistrationPrompt() {
  const navigate = useNavigate()
  const [state, setState] = useState<State>('teaser')
  const [dismissed, setDismissed] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [apiError, setApiError] = useState<string | null>(null)

  if (dismissed) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('submitting')
    setApiError(null)
    try {
      await register(email, password, name)
      setState('success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setApiError(message)
      setState('form')
    }
  }

  if (state === 'success') {
    return (
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-4">
        <p className="text-sm font-medium text-blue-900">Check your email</p>
        <p className="mt-1 text-sm text-blue-700">
          We sent a verification link to <strong>{email}</strong>. Click it to activate your account, then{' '}
          <button
            onClick={() => void navigate('/login')}
            className="underline hover:text-blue-900"
          >
            sign in
          </button>{' '}
          to manage your project.
        </p>
      </div>
    )
  }

  if (state === 'teaser') {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
        <p className="text-sm text-gray-600 mb-2">Create a free account to manage and revisit this project.</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setState('form')}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Save my project
          </button>
          <button
            onClick={() => void navigate('/login')}
            className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
          >
            Sign in
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600"
          >
            Just download
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-900">Create your account</p>
        <button
          onClick={() => setState('teaser')}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Close form"
        >
          ✕
        </button>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1" htmlFor="reg-name">
            Display name
          </label>
          <input
            id="reg-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={state === 'submitting'}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1" htmlFor="reg-email">
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={state === 'submitting'}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1" htmlFor="reg-password">
            Password
          </label>
          <input
            id="reg-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={state === 'submitting'}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
            placeholder="Min. 8 characters"
          />
        </div>

        {apiError && (
          <p className="text-xs text-red-600">{apiError}</p>
        )}

        <button
          type="submit"
          disabled={state === 'submitting'}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
        >
          {state === 'submitting' ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-3 text-xs text-gray-500">
        Already have an account?{' '}
        <button
          onClick={() => void navigate('/login')}
          className="text-blue-600 hover:underline"
        >
          Sign in
        </button>
      </p>
    </div>
  )
}
