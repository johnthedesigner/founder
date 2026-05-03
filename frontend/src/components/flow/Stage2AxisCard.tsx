interface Stage2AxisCardProps {
  label: string
  subtitle: string
  isSelected: boolean
  onClick: () => void
  preview?: React.ReactNode
}

export function Stage2AxisCard({
  label,
  subtitle,
  isSelected,
  onClick,
  preview,
}: Stage2AxisCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-colors min-w-[108px] ${
        isSelected
          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {preview && <div className="mb-2 w-full">{preview}</div>}
      <div className="text-sm font-medium text-gray-900">{label}</div>
      <div className="mt-0.5 text-xs text-gray-500 leading-snug">{subtitle}</div>
    </button>
  )
}
