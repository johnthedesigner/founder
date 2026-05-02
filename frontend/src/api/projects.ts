import { apiRequest } from './client'
import type { ProjectConfig } from '@ds-gen/types'

export interface Project {
  id: string
  userId: string
  name: string
  slug: string
  config: ProjectConfig
  lastExportedAt: string | null
  createdAt: string
  updatedAt: string
}

export async function listProjects(): Promise<{ projects: Project[] }> {
  return apiRequest('GET', '/projects')
}

export async function getProject(id: string): Promise<{ project: Project }> {
  return apiRequest('GET', `/projects/${id}`)
}
