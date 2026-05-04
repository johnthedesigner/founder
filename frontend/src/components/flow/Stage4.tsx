import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../../store/uiStore'
import { useConfigStore } from '../../store/configStore'
import { createProject } from '../../api/projects'
import { useAnonymousStore } from '../../store/anonymousStore'
import { Stage4RegistrationPrompt } from './Stage4RegistrationPrompt'

async function downloadZip(projectId: string, filename: string) {
  const token = useAnonymousStore.getState().getToken(projectId)
  const headers: HeadersInit = token ? { 'X-Owner-Token': token } : {}
  const res = await fetch(`/projects/${projectId}/export.zip`, { headers })
  if (!res.ok) throw new Error('Export failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function FigmaModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Figma Setup — Tokens Studio</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <ol className="space-y-3">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">1</span>
            <div>
              <p className="text-sm font-medium text-gray-800">Install Tokens Studio</p>
              <p className="text-xs text-gray-500 mt-0.5">Add the Tokens Studio plugin from the Figma Community.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">2</span>
            <div>
              <p className="text-sm font-medium text-gray-800">Import token files</p>
              <p className="text-xs text-gray-500 mt-0.5">
                In Tokens Studio → Settings → Import: upload <code className="font-mono bg-gray-100 px-1 rounded">tokens/primitives.json</code> and <code className="font-mono bg-gray-100 px-1 rounded">tokens/semantic.json</code> from your ZIP.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">3</span>
            <div>
              <p className="text-sm font-medium text-gray-800">Apply tokens</p>
              <p className="text-xs text-gray-500 mt-0.5">Select layers and use Tokens Studio to apply semantic tokens to fills, strokes, and text styles.</p>
            </div>
          </li>
        </ol>
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export function Stage4() {
  const navigate = useNavigate()
  const projectName = useUIStore((s) => s.projectName)
  const savedProjectId = useUIStore((s) => s.savedProjectId)
  const setSavedProjectId = useUIStore((s) => s.setSavedProjectId)
  const config = useConfigStore((s) => s.config)
  const resetConfig = useConfigStore((s) => s.resetConfig)

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [cliCopied, setCliCopied] = useState(false)
  const [showFigma, setShowFigma] = useState(false)

  const shareUrl = savedProjectId
    ? `${window.location.origin}/projects/${savedProjectId}`
    : null

  const cliCommand = savedProjectId
    ? `npx @ds-gen/cli init --project=${savedProjectId}`
    : null

  async function ensureSaved(): Promise<string> {
    if (savedProjectId) return savedProjectId
    setIsSaving(true)
    setError(null)
    try {
      const { project } = await createProject({ name: projectName, config })
      setSavedProjectId(project.id)
      resetConfig()
      return project.id
    } catch {
      setError('Failed to save project. Please try again.')
      throw new Error('save failed')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDownload() {
    try {
      const id = await ensureSaved()
      const safeName = projectName.trim().replace(/[^a-z0-9-_]/gi, '-').toLowerCase() || 'design-system'
      await downloadZip(id, `${safeName}.zip`)
    } catch {
      // error already set by ensureSaved or download failure
      if (!error) setError('Download failed. Please try again.')
    }
  }

  async function handleUseCli() {
    await ensureSaved().catch(() => {})
  }

  function handleCopyLink() {
    if (!shareUrl) return
    void navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleCopyCli() {
    if (!cliCommand) return
    void navigator.clipboard.writeText(cliCommand)
    setCliCopied(true)
    setTimeout(() => setCliCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Export</h2>
        <p className="mt-1 text-sm text-gray-500">
          Download your design system or integrate with your tools.
        </p>
      </div>

      {/* Saved URL banner */}
      {shareUrl && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm font-medium text-green-800 mb-1">Your design system is saved</p>
          <div className="flex items-center gap-2">
            <a
              href={shareUrl}
              onClick={(e) => { e.preventDefault(); void navigate(`/projects/${savedProjectId}`) }}
              className="flex-1 truncate text-xs font-mono text-green-700 hover:underline"
            >
              {shareUrl}
            </a>
            <button
              onClick={handleCopyLink}
              className="shrink-0 rounded bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {/* Primary CTA */}
      <div className="space-y-3">
        <button
          onClick={() => void handleDownload()}
          disabled={isSaving}
          className="w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
        >
          {isSaving ? 'Saving…' : 'Download package'}
        </button>

        {/* Use the CLI */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-800">Use the CLI</span>
            <button
              onClick={() => void handleUseCli()}
              disabled={isSaving}
              className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-40"
            >
              {savedProjectId ? 'Ready' : 'Save first'}
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-gray-900 px-3 py-2">
            <code className="flex-1 text-xs text-green-400 font-mono break-all">
              {cliCommand ?? 'npx @ds-gen/cli init --project=<id>'}
            </code>
            {cliCommand && (
              <button
                onClick={handleCopyCli}
                className="shrink-0 text-xs text-gray-400 hover:text-white"
              >
                {cliCopied ? '✓' : 'Copy'}
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            Requires an account — sign in to use the CLI
          </p>
        </div>

        {/* Figma setup */}
        <button
          onClick={() => setShowFigma(true)}
          className="w-full rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Figma setup
        </button>
      </div>

      {/* Account prompt */}
      <Stage4RegistrationPrompt />

      {showFigma && <FigmaModal onClose={() => setShowFigma(false)} />}
    </div>
  )
}
