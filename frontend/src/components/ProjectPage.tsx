import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useConfigStore, DEFAULT_CONFIG } from '../store/configStore'
import { useUIStore } from '../store/uiStore'
import { useUserStore } from '../store/userStore'
import { getProject, updateProject } from '../api/projects'
import type { Project } from '../api/projects'
import { ApiResponseError } from '../api/client'
import { SystemPreview } from './preview/SystemPreview'
import { Stage1 } from './flow/Stage1'
import { Stage2 } from './flow/Stage2'
import { Stage3 } from './flow/Stage3'
import { Stage4 } from './flow/Stage4'
import { SaveIndicator } from './shared/SaveIndicator'

const STAGES = [
  { label: 'Foundation' },
  { label: 'Style' },
  { label: 'Review' },
  { label: 'Export' },
] as const

const STAGE_COMPONENTS = [Stage1, Stage2, Stage3, Stage4] as const

export function ProjectPage() {
  const { id } = useParams<{ id: string }>()

  const config = useConfigStore((s) => s.config)
  const currentStage = useUIStore((s) => s.currentStage)
  const advance = useUIStore((s) => s.advance)
  const goBack = useUIStore((s) => s.goBack)
  const canAdvance = useUIStore((s) => s.canAdvance)
  const setCanAdvance = useUIStore((s) => s.setCanAdvance)
  const setProjectName = useUIStore((s) => s.setProjectName)
  const setSavedProjectId = useUIStore((s) => s.setSavedProjectId)
  const setIsSaving = useUIStore((s) => s.setIsSaving)
  const setLastSavedAt = useUIStore((s) => s.setLastSavedAt)

  const { user, fetchUser } = useUserStore()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const initialConfigJson = useRef<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch current user so we know whether to auto-save
  useEffect(() => {
    void fetchUser()
  }, [fetchUser])

  // Load project and hydrate stores
  useEffect(() => {
    if (!id) return

    useUIStore.getState().setStage(0)
    setLoading(true)
    setError(null)

    getProject(id)
      .then(({ project: p }) => {
        setProject(p)
        // Hydrate config without writing to localStorage (server is source of truth)
        useConfigStore.setState({ config: p.config })
        initialConfigJson.current = JSON.stringify(p.config)
        setProjectName(p.name)
        setSavedProjectId(p.id)
      })
      .catch((err) => {
        if (err instanceof ApiResponseError && err.status === 404) {
          setError('Project not found')
        } else {
          setError('Failed to load project')
        }
      })
      .finally(() => setLoading(false))

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      // Restore defaults without touching localStorage (preserves any /new draft)
      useConfigStore.setState({ config: DEFAULT_CONFIG })
      useUIStore.setState({
        savedProjectId: null,
        projectName: 'My Design System',
        currentStage: 0,
        isSaving: false,
        lastSavedAt: null,
      })
    }
  }, [id, setProjectName, setSavedProjectId])

  // Stages 1, 2, and 4 always allow advancing
  useEffect(() => {
    if (currentStage !== 2) setCanAdvance(true)
  }, [currentStage, setCanAdvance])

  // Auto-save on config change (authenticated owners only, skips initial load)
  useEffect(() => {
    if (initialConfigJson.current === null) return
    if (JSON.stringify(config) === initialConfigJson.current) return
    if (!user || !project?.canEdit) return

    if (saveTimer.current) clearTimeout(saveTimer.current)

    saveTimer.current = setTimeout(() => {
      setIsSaving(true)
      updateProject(id!, { config })
        .then(() => setLastSavedAt(new Date()))
        .catch(() => { /* silent — stale indicator remains */ })
        .finally(() => setIsSaving(false))
    }, 500)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [config, id, user, project?.canEdit, setIsSaving, setLastSavedAt])

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

  const StageComponent = STAGE_COMPONENTS[currentStage]
  const isFinalStage = currentStage === 3

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">
            ← Projects
          </Link>
          <span className="text-sm font-semibold text-gray-900">{project.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <SaveIndicator />
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
      </header>

      {/* Stage progress */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-3">
        <nav className="flex gap-1" aria-label="Progress">
          {STAGES.map((stage, i) => {
            const isActive = i === currentStage
            const isDone = i < currentStage
            return (
              <div key={stage.label} className="flex items-center">
                {i > 0 && (
                  <div className={`mx-2 h-px w-8 ${isDone ? 'bg-blue-500' : 'bg-gray-200'}`} />
                )}
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isDone
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      isActive ? 'text-gray-900' : isDone ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
              </div>
            )
          })}
        </nav>
      </div>

      {/* Main two-column body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: stage content */}
        <div className="flex w-[480px] shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white">
          <div className="flex-1 px-8 py-8">
            <StageComponent />
          </div>

          {/* Navigation buttons */}
          <div className="shrink-0 border-t border-gray-100 px-8 py-5 flex justify-between items-center">
            <button
              onClick={goBack}
              disabled={currentStage === 0}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            {!isFinalStage && (
              <button
                onClick={advance}
                disabled={!canAdvance}
                className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            )}
          </div>
        </div>

        {/* Right: live preview */}
        <div className="flex flex-1 items-stretch p-6">
          <SystemPreview />
        </div>
      </div>
    </div>
  )
}
