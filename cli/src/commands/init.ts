import * as fs from 'fs-extra'
import * as path from 'path'
import prompts from 'prompts'
import { loadConfig, saveConfig } from '../config'
import { fetchManifest } from '../manifest'

const DEFAULT_API_URL = 'https://ds-gen.com'
const META_FILE = '.design-system-meta.json'

interface Meta {
  projectId: string
  apiUrl: string
  generatedAt: string
}

function parseArgs(args: string[]): { projectId?: string; token?: string; apiUrl?: string } {
  const result: { projectId?: string; token?: string; apiUrl?: string } = {}
  for (const arg of args) {
    if (arg.startsWith('--project=')) result.projectId = arg.slice('--project='.length)
    if (arg.startsWith('--token=')) result.token = arg.slice('--token='.length)
    if (arg.startsWith('--api-url=')) result.apiUrl = arg.slice('--api-url='.length)
  }
  return result
}

export async function runInit(args: string[]): Promise<void> {
  const { projectId, token: flagToken, apiUrl: flagApiUrl } = parseArgs(args)

  if (!projectId) {
    console.error('Error: --project=<id> is required')
    process.exit(1)
  }

  const config = await loadConfig()
  const apiUrl = flagApiUrl ?? process.env['DS_GEN_API_URL'] ?? config.apiUrl ?? DEFAULT_API_URL

  let token = flagToken ?? process.env['DS_GEN_TOKEN'] ?? config.token
  if (!token) {
    const answer = await prompts({
      type: 'password',
      name: 'token',
      message: 'Enter your CLI token (from Account Settings → CLI Access):',
    })
    if (!answer.token) {
      console.error('Error: CLI token is required')
      process.exit(1)
    }
    token = answer.token as string
    await saveConfig({ ...config, token })
    console.log('Token saved to ~/.ds-gen/config.json')
  }

  console.log(`Fetching design system for project ${projectId}...`)

  let manifest
  try {
    manifest = await fetchManifest(projectId, token, apiUrl)
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`)
    process.exit(1)
  }

  for (const file of manifest.files) {
    const dest = path.join(process.cwd(), file.path)
    await fs.ensureDir(path.dirname(dest))
    await fs.writeFile(dest, file.content, 'utf8')
  }

  const meta: Meta = { projectId, apiUrl, generatedAt: new Date().toISOString() }
  await fs.writeJson(path.join(process.cwd(), META_FILE), meta, { spaces: 2 })

  console.log(`✓ Wrote ${manifest.files.length} files`)
  console.log(`✓ Saved ${META_FILE}`)
}
