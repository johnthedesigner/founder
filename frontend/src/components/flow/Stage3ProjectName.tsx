import { useEffect, useRef } from 'react'
import { useUIStore } from '../../store/uiStore'

export function Stage3ProjectName() {
  const projectName = useUIStore((s) => s.projectName)
  const setProjectName = useUIStore((s) => s.setProjectName)
  const setCanAdvance = useUIStore((s) => s.setCanAdvance)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setProjectName(value)
    setCanAdvance(value.trim().length > 0)
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        Project name
      </label>
      <input
        ref={inputRef}
        type="text"
        value={projectName}
        onChange={handleChange}
        placeholder="My Design System"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {projectName.trim().length === 0 && (
        <p className="mt-1 text-xs text-red-500">Name is required to continue.</p>
      )}
    </div>
  )
}
