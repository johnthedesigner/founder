import { Stage1ProjectType } from './Stage1ProjectType'
import { Stage1BrandAssets } from './Stage1BrandAssets'
import { Stage1ModeSelect } from './Stage1ModeSelect'

export function Stage1() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Foundation</h2>
        <p className="mt-1 text-sm text-gray-500">
          Choose your project type and visual direction.
        </p>
      </div>

      <Stage1ProjectType />

      <hr className="border-gray-100" />

      <Stage1BrandAssets />

      <hr className="border-gray-100" />

      <Stage1ModeSelect />
    </div>
  )
}
