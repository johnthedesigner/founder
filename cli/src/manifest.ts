export interface ManifestFile {
  path: string
  content: string
}

export interface Manifest {
  files: ManifestFile[]
}

export async function fetchManifest(
  projectId: string,
  token: string,
  apiUrl: string,
): Promise<Manifest> {
  const url = `${apiUrl}/api/v1/systems/${projectId}/manifest`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 404) throw new Error(`Project '${projectId}' not found`)
  if (res.status === 401) throw new Error('Invalid or expired CLI token')
  if (!res.ok) throw new Error(`Server error: ${res.status}`)
  return res.json() as Promise<Manifest>
}
