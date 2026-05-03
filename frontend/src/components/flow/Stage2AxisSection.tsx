import { useState } from 'react'

interface Stage2AxisSectionProps {
  title: string
  children: React.ReactNode
  customizeContent?: React.ReactNode
}

export function Stage2AxisSection({
  title,
  children,
  customizeContent,
}: Stage2AxisSectionProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {customizeContent && (
          <button
            onClick={() => setIsOpen((v) => !v)}
            className="text-xs text-blue-600 hover:text-blue-700 select-none"
          >
            {isOpen ? 'Done' : 'Customize'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">{children}</div>

      {customizeContent && (
        <div
          className={`overflow-hidden transition-all duration-200 ${
            isOpen ? 'mt-3 max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            {customizeContent}
          </div>
        </div>
      )}
    </div>
  )
}
