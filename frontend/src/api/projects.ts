import { apiRequest } from './client'
import { useAnonymousStore } from '../store/anonymousStore'
import type { ProjectConfig } from '@ds-gen/types'

export interface Project {
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

function ownerTokenHeader(id: string): Record<string, string> {
  const token = useAnonymousStore.getState().getToken(id)
  return token ? { 'X-Owner-Token': token } : {}
}

export async function listProjects(): Promise<{ projects: Project[] }> {
  return apiRequest('GET', '/projects')
}

export async function getProject(id: string): Promise<{ project: Project }> {
  return apiRequest('GET', `/projects/${id}`, undefined, { headers: ownerTokenHeader(id) })
}

export async function createProject(data: {
  name: string
  config: ProjectConfig
}): Promise<{ project: Project; ownerToken?: string }> {
  const result = await apiRequest<{ project: Project; ownerToken?: string }>('POST', '/projects', data)
  if (result.ownerToken) {
    useAnonymousStore.getState().addEntry({
      id: result.project.id,
      ownerToken: result.ownerToken,
      name: result.project.name,
      createdAt: result.project.createdAt,
    })
  }
  return result
}

export async function updateProject(
  id: string,
  data: { name?: string; config?: ProjectConfig },
): Promise<{ project: Project }> {
  return apiRequest('PATCH', `/projects/${id}`, data, { headers: ownerTokenHeader(id) })
}

export async function deleteProject(id: string): Promise<void> {
  return apiRequest('DELETE', `/projects/${id}`, undefined, { headers: ownerTokenHeader(id) })
}

export async function claimProject(
  id: string,
  ownerToken: string,
): Promise<{ project: Project }> {
  return apiRequest('POST', `/projects/${id}/claim`, undefined, {
    headers: { 'X-Owner-Token': ownerToken },
  })
}
