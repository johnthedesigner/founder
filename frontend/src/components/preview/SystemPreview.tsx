import { useEffect, useRef, useState } from 'react'
import { useConfigStore } from '../../store/configStore'

const READY_TIMEOUT_MS = 8000
const PREVIEW_URL = import.meta.env.VITE_PREVIEW_SANDBOX_URL ?? 'http://localhost:5180'
const DEBOUNCE_MS = 50

function PreviewSkeleton() {
  return (
    <div className="flex h-full w-full flex-col gap-4 p-6 animate-pulse">
      <div className="h-3 w-24 rounded bg-gray-200" />
      <div className="flex gap-1">
        {Array.from({ length: 11 }).map((_, i) => (
          <div key={i} className="h-9 flex-1 rounded bg-gray-200" />
        ))}
      </div>
      <div className="mt-4 h-3 w-20 rounded bg-gray-200" />
      <div className="flex gap-1">
        {Array.from({ length: 11 }).map((_, i) => (
          <div key={i} className="h-9 flex-1 rounded bg-gray-200" />
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-5 rounded bg-gray-200" style={{ width: `${70 - i * 8}%` }} />
        ))}
      </div>
      <div className="mt-4 flex gap-3">
        <div className="h-9 w-24 rounded bg-gray-200" />
        <div className="h-9 w-24 rounded bg-gray-200" />
        <div className="h-9 w-36 rounded bg-gray-200" />
      </div>
    </div>
  )
}

function PreviewFallback({ primaryHex }: { primaryHex: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-50 p-6">
      <div className="space-y-2 text-center">
        <div className="flex gap-1 justify-center">
          {[0.08, 0.15, 0.25, 0.4, 0.55, 0.7, 0.82, 0.9, 0.95].map((opacity, i) => (
            <div
              key={i}
              className="h-10 w-8 rounded"
              style={{ backgroundColor: primaryHex, opacity }}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400">Preview loading…</p>
      </div>
    </div>
  )
}

export function SystemPreview() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const config = useConfigStore((s) => s.config)

  // Listen for READY from iframe; set 3s timeout
  useEffect(() => {
    const timeout = setTimeout(() => setTimedOut(true), READY_TIMEOUT_MS)

    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'READY') {
        setReady(true)
        clearTimeout(timeout)
        ;(window as Window & { __previewReady?: boolean }).__previewReady = true
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'CONFIG_UPDATE', config: useConfigStore.getState().config },
          '*',
        )
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
      clearTimeout(timeout)
    }
  }, [])

  // Debounced config updates once ready
  useEffect(() => {
    if (!ready) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'CONFIG_UPDATE', config },
        '*',
      )
    }, DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [config, ready])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
      <iframe
        ref={iframeRef}
        src={PREVIEW_URL}
        title="Design System Preview"
        className="h-full w-full border-none transition-opacity duration-200"
        style={{ opacity: ready ? 1 : 0 }}
      />
      {!ready && !timedOut && (
        <div className="absolute inset-0">
          <PreviewSkeleton />
        </div>
      )}
      {!ready && timedOut && (
        <div className="absolute inset-0">
          <PreviewFallback primaryHex={config.color.primaryHex} />
        </div>
      )}
    </div>
  )
}
