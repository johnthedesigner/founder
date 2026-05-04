import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateColorScale } from '@pipeline/palette/generator'
import { updateProject, createProject, deleteProject } from '../../api/projects'
import type { Project } from '../../api/projects'

const PROJECT_TYPE_LABELS: Record<string, string> = {
  saas: 'SaaS / Web App',
  marketing: 'Marketing Site',
  mobile: 'Mobile App',
}

const THUMBNAIL_STEPS = [100, 300, 500, 700, 900]

interface ProjectCardProps {
  project: Project
  onMutate: () => void
}

export function ProjectCard({ project, onMutate }: ProjectCardProps) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [nameInput, setNameInput] = useState(project.name)
  const menuRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  const scale = generateColorScale(project.config.color.primaryHex)
  const swatches = THUMBNAIL_STEPS.map((step) => scale[step] ?? '#e5e7eb')

  const lastExported = project.lastExportedAt
    ? new Date(project.lastExportedAt).toLocaleDateString()
    : 'Never'

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (renaming) renameInputRef.current?.focus()
  }, [renaming])

  function startRename() {
    setMenuOpen(false)
    setNameInput(project.name)
    setRenaming(true)
  }

  async function commitRename() {
    const trimmed = nameInput.trim()
    if (!trimmed) {
      setNameInput(project.name)
      setRenaming(false)
      return
    }
    setRenaming(false)
    if (trimmed === project.name) return
    await updateProject(project.id, { name: trimmed }).catch(() => {})
    onMutate()
  }

  function cancelRename() {
    setNameInput(project.name)
    setRenaming(false)
  }

  async function handleDuplicate() {
    setMenuOpen(false)
    await createProject({ name: `${project.name} (copy)`, config: project.config }).catch(() => {})
    onMutate()
  }

  async function handleDelete() {
    setMenuOpen(false)
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return
    await deleteProject(project.id).catch(() => {})
    onMutate()
  }

  return (
    <li className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Palette thumbnail */}
      <div className="flex h-10">
        {swatches.map((color, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: color }} />
        ))}
      </div>

      <div className="p-5">
        {/* Name row */}
        <div className="flex items-start gap-2">
          {renaming ? (
            <input
              ref={renameInputRef}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={() => void commitRename()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void commitRename()
                if (e.key === 'Escape') cancelRename()
              }}
              className="flex-1 min-w-0 rounded border border-blue-400 px-2 py-0.5 text-sm font-semibold text-gray-900 focus:outline-none"
            />
          ) : (
            <h3
              onClick={() => void navigate(`/projects/${project.id}`)}
              className="flex-1 min-w-0 text-sm font-semibold text-gray-900 hover:text-blue-600 leading-snug truncate cursor-pointer"
            >
              {project.name}
            </h3>
          )}

          {/* Overflow menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 leading-none"
              aria-label="Project options"
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 z-10 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  onClick={startRename}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Rename
                </button>
                <button
                  onClick={() => void handleDuplicate()}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => void handleDelete()}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chips */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {PROJECT_TYPE_LABELS[project.config.projectType] ?? project.config.projectType}
          </span>
          {project.config.modes.map((mode) => (
            <span key={mode} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 capitalize">
              {mode}
            </span>
          ))}
        </div>

        <p className="mt-3 text-xs text-gray-400">Last exported: {lastExported}</p>
      </div>
    </li>
  )
}
