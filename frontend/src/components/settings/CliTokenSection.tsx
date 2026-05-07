import { useCallback, useEffect, useState } from 'react'
import { getCliToken, revokeCliToken } from '../../api/auth'

export function CliTokenSection() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState(false)
  const [copying, setCopying] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchToken = useCallback(() => {
    setLoading(true)
    setError(null)
    getCliToken()
      .then(({ token: t }) => setToken(t))
      .catch(() => setError('Failed to load CLI token'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchToken()
  }, [fetchToken])

  function handleCopy() {
    if (!token) return
    void navigator.clipboard.writeText(token).then(() => {
      setCopying(true)
      setTimeout(() => setCopying(false), 2000)
    })
  }

  function handleRevoke() {
    setRevoking(true)
    setRevealed(false)
    revokeCliToken()
      .then(() => fetchToken())
      .catch(() => setError('Failed to revoke token'))
      .finally(() => setRevoking(false))
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-base font-semibold text-gray-900">CLI access</h2>
      <p className="mt-1 text-sm text-gray-500">
        Use this token to authenticate the{' '}
        <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">ds-gen</code> CLI tool.
      </p>

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-gray-400">Loading token…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <code
                className={[
                  'flex-1 overflow-hidden rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-800 select-all',
                  revealed ? '' : 'blur-sm select-none',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {token}
              </code>
              <button
                onClick={() => setRevealed((r) => !r)}
                className="shrink-0 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {revealed ? 'Hide' : 'Reveal'}
              </button>
              <button
                onClick={handleCopy}
                disabled={copying}
                className="shrink-0 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {copying ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <button
              onClick={handleRevoke}
              disabled={revoking}
              className="mt-3 text-xs text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
            >
              {revoking ? 'Revoking…' : 'Revoke and regenerate'}
            </button>
          </>
        )}
      </div>

      <div className="mt-6 space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Quick start</h3>
        <div>
          <p className="mb-1 text-xs text-gray-500">Initialize in your project directory:</p>
          <code className="block rounded-md bg-gray-900 px-4 py-3 font-mono text-xs text-green-400">
            npx @ds-gen/cli init --project=&lt;your-project-id&gt;
          </code>
        </div>
        <div>
          <p className="mb-1 text-xs text-gray-500">Sync after making changes:</p>
          <code className="block rounded-md bg-gray-900 px-4 py-3 font-mono text-xs text-green-400">
            npx @ds-gen/cli sync
          </code>
        </div>
        <p className="text-xs text-gray-400">
          The CLI saves your token to{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5">~/.ds-gen/config.json</code> after
          the first run so you don't need to pass it each time.
        </p>
      </div>
    </section>
  )
}
