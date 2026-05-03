import type { ProjectConfig } from './config'
import type { GeneratedFile } from './output'

// ---- Auth ----

export interface RegisterRequest {
  email: string
  password: string
  displayName: string
}

export interface VerifyEmailRequest {
  token: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
}

export interface UserResponse {
  id: string
  email: string
  displayName: string
  emailVerified: boolean
  createdAt: string
}

export interface MeResponse {
  user: UserResponse
}

// ---- Projects ----

export interface ProjectResponse {
  id: string
  userId: string | null
  canEdit: boolean
  name: string
  slug: string
  config: ProjectConfig
  lastExportedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AnonymousCreateProjectResponse {
  project: ProjectResponse
  ownerToken: string
}

export interface CreateProjectRequest {
  name?: string
  config: ProjectConfig
}

export interface UpdateProjectRequest {
  name?: string
  config?: Partial<ProjectConfig>
}

export interface ProjectListResponse {
  projects: ProjectResponse[]
}

// ---- Generation ----

export interface ExportResponse {
  files: GeneratedFile[]
}

// ---- Agent API ----

export interface AgentSpecResponse {
  version: string
  projectId: string
  projectName: string
  generatedAt: string
  config: Pick<ProjectConfig, 'projectType' | 'modes' | 'componentScope'>
  tokens: {
    primitives: unknown
    semantic: unknown
    component: unknown
  }
  components: unknown[]
  rules: Record<string, string>
}

// ---- CLI manifest ----

export interface CliManifestResponse {
  projectId: string
  files: GeneratedFile[]
}

// ---- Health ----

export interface HealthResponse {
  db: 'ok' | 'error'
  status: 'ok' | 'degraded'
}
