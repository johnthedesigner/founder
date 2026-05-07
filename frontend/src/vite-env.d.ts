/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PREVIEW_SANDBOX_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
