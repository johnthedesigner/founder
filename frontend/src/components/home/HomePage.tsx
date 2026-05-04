import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../../store/userStore'
import { useConfigStore } from '../../store/configStore'
import { listProjects } from '../../api/projects'
import type { Project } from '../../api/projects'
import { ProjectGrid } from './ProjectGrid'

export function HomePage() {
  const { user, isLoading, fetchUser } = useUserStore()
  const navigate = useNavigate()
  const resetConfig = useConfigStore((s) => s.resetConfig)
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)

  useEffect(() => {
    void fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (!isLoading && user === null) {
      void navigate('/login')
    }
  }, [isLoading, user, navigate])

  const loadProjects = useCallback(() => {
    if (!user) return
    setProjectsLoading(true)
    listProjects()
      .then(({ projects: p }) => setProjects(p))
      .catch(() => setProjects([]))
      .finally(() => setProjectsLoading(false))
  }, [user])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  function handleNewProject() {
    resetConfig()
    void navigate('/new')
  }

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
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Design System Generator</h1>
          <span className="text-sm text-gray-500">{user.email}</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Your projects</h2>
          <button
            onClick={handleNewProject}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            New project
          </button>
        </div>
        {projectsLoading ? (
          <p className="text-gray-400">Loading projects…</p>
        ) : (
          <ProjectGrid projects={projects} onMutate={loadProjects} />
        )}
      </main>
    </div>
  )
}
