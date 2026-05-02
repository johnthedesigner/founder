import JSZip from 'jszip'
import type { GeneratedFile } from '@ds-gen/types'

export async function assembleZip(files: GeneratedFile[]): Promise<Buffer> {
  const zip = new JSZip()

  for (const file of files) {
    zip.file(file.path, file.content)
  }

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}
