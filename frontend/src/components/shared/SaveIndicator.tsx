import { useUIStore } from '../../store/uiStore'

function formatAge(date: Date): string {
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin === 1) return '1 min ago'
  return `${diffMin} min ago`
}

export function SaveIndicator() {
  const isSaving = useUIStore((s) => s.isSaving)
  const lastSavedAt = useUIStore((s) => s.lastSavedAt)

  if (isSaving) return <span className="text-xs text-gray-400">Saving…</span>
  if (!lastSavedAt) return null
  return <span className="text-xs text-gray-400">Saved {formatAge(lastSavedAt)}</span>
}
