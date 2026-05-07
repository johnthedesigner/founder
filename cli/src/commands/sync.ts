import * as fs from 'fs-extra'
import * as path from 'path'
import prompts from 'prompts'
import { loadConfig, saveConfig } from '../config'
import { fetchManifest } from '../manifest'

const META_FILE = '.design-system-meta.json'

interface Meta {
  projectId: string
  apiUrl: string
  generatedAt: string
}

export async function runSync(args: string[]): Promise<void> {
  const metaPath = path.join(process.cwd(), META_FILE)

  let meta: Meta
  try {
    meta = (await fs.readJson(metaPath)) as Meta
  } catch {
    console.error(`Error: ${META_FILE} not found. Run 'ds-gen init --project=<id>' first.`)
    process.exit(1)
  }

  const flagToken = args.find((a) => a.startsWith('--token='))?.slice('--token='.length)
  const config = await loadConfig()
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

  console.log(`Syncing design system for project ${meta.projectId}...`)

  let manifest
  try {
    manifest = await fetchManifest(meta.projectId, token, meta.apiUrl)
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`)
    process.exit(1)
  }

  for (const file of manifest.files) {
    const dest = path.join(process.cwd(), file.path)
    await fs.ensureDir(path.dirname(dest))
    await fs.writeFile(dest, file.content, 'utf8')
  }

  meta.generatedAt = new Date().toISOString()
  await fs.writeJson(metaPath, meta, { spaces: 2 })

  console.log(`✓ Updated ${manifest.files.length} files`)
  console.log(`✓ Updated ${META_FILE}`)
}
