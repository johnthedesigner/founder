import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProject } from '../api/projects'
import type { Project } from '../api/projects'
import { ApiResponseError } from '../api/client'

export function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getProject(id)
      .then(({ project }) => setProject(project))
      .catch((err) => {
        if (err instanceof ApiResponseError && err.status === 404) {
          setError('Project not found')
        } else {
          setError('Failed to load project')
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">{error ?? 'Project not found'}</p>
          <Link to="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
            Go home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{project.name}</h1>
            {!project.userId && (
              <p className="mt-0.5 text-xs text-gray-400">Anonymous project</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {project.canEdit ? (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                You own this
              </span>
            ) : (
              <Link
                to="/login"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Sign in to edit
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Project editor coming in Phase 2.</p>
          <pre className="mt-4 overflow-auto rounded-md bg-gray-50 p-4 text-xs text-gray-700">
            {JSON.stringify(project.config, null, 2)}
          </pre>
        </div>
      </main>
    </div>
  )
}
