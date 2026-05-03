import { useState, useEffect } from 'react'
import type { ProjectConfig } from '@ds-gen/types'
import { generatePreviewTokens } from './generatePreviewTokens'
import { SystemPreviewLayout } from './SystemPreviewLayout'
import { DEFAULT_CONFIG } from '@pipeline/palette/defaults'

export function TokenApplicator() {
  const [config, setConfig] = useState<ProjectConfig>(DEFAULT_CONFIG)

  useEffect(() => {
    window.parent.postMessage({ type: 'READY' }, '*')

    function handleMessage(event: MessageEvent) {
      if (
        event.data &&
        typeof event.data === 'object' &&
        event.data.type === 'CONFIG_UPDATE'
      ) {
        setConfig(event.data.config as ProjectConfig)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    const css = generatePreviewTokens(config)
    let styleEl = document.getElementById(
      'ds-preview-tokens',
    ) as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'ds-preview-tokens'
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = css
  }, [config])

  return <SystemPreviewLayout config={config} />
}
