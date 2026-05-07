import * as fs from 'fs-extra'
import * as os from 'os'
import * as path from 'path'

export interface CliConfig {
  token?: string
  apiUrl?: string
}

const CONFIG_PATH = path.join(os.homedir(), '.ds-gen', 'config.json')

export async function loadConfig(): Promise<CliConfig> {
  try {
    return (await fs.readJson(CONFIG_PATH)) as CliConfig
  } catch {
    return {}
  }
}

export async function saveConfig(config: CliConfig): Promise<void> {
  await fs.ensureDir(path.dirname(CONFIG_PATH))
  await fs.writeJson(CONFIG_PATH, config, { spaces: 2 })
}
