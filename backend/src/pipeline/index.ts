import type {
  ProjectConfig,
  GeneratedSystem,
  GeneratedFile,
  TokenSet,
  ComponentSpec,
} from '@ds-gen/types'
import { generatePrimitives } from './tokens/primitives'
import { generateSemanticTokens } from './tokens/semantic'
import { generateComponentTokens } from './tokens/component'
import { generateComponents } from './components/index'
import { buildComponentSpecs } from './docs/component-specs'
import { generateReadme } from './docs/readme'
import { generateTokensDoc } from './docs/tokens-doc'
import { generateComponentsDoc } from './docs/components-doc'
import { generateDecisions } from './docs/decisions'
import { generateAgentSpec } from './docs/agent-spec'
import { serializeToW3C } from './export/w3c'
import { serializeToCSS } from './export/css'
import { serializeToTailwind } from './export/tailwind'

type BarrelEntry = {
  name: string
  dir: string
  values: string[]
  types: string[]
}

const BARREL_ENTRIES: BarrelEntry[] = [
  { name: 'Button', dir: 'button', values: ['Button'], types: ['ButtonProps', 'ButtonVariant', 'ButtonSize'] },
  { name: 'Input', dir: 'input', values: ['Input'], types: ['InputProps'] },
  { name: 'Select', dir: 'select', values: ['Select', 'SelectTrigger'], types: [] },
  { name: 'Checkbox', dir: 'checkbox', values: ['Checkbox'], types: ['CheckboxProps'] },
  { name: 'Radio', dir: 'radio', values: ['Radio'], types: ['RadioProps'] },
  { name: 'Switch', dir: 'switch', values: ['Switch'], types: ['SwitchProps'] },
  { name: 'Slider', dir: 'slider', values: ['Slider'], types: ['SliderProps'] },
  { name: 'Dialog', dir: 'dialog', values: ['Dialog', 'DialogContent'], types: ['DialogContentProps'] },
  { name: 'Tooltip', dir: 'tooltip', values: ['Tooltip', 'TooltipWrapper'], types: ['TooltipProps'] },
  { name: 'Popover', dir: 'popover', values: ['Popover', 'PopoverContent'], types: ['PopoverContentProps'] },
  { name: 'Tabs', dir: 'tabs', values: ['Tabs', 'TabsTab'], types: ['TabsTabProps'] },
  { name: 'Menu', dir: 'menu', values: ['Menu', 'MenuItem', 'MenuPopup'], types: ['MenuItemProps'] },
  { name: 'Form Field', dir: 'form-field', values: ['FormField'], types: ['FormFieldProps'] },
  { name: 'Card', dir: 'card', values: ['Card', 'CardHeader', 'CardBody', 'CardFooter'], types: ['CardProps', 'CardHeaderProps', 'CardBodyProps', 'CardFooterProps'] },
  { name: 'Badge', dir: 'badge', values: ['Badge'], types: ['BadgeProps', 'BadgeVariant'] },
  { name: 'Alert', dir: 'alert', values: ['Alert'], types: ['AlertProps', 'AlertVariant'] },
  { name: 'Avatar', dir: 'avatar', values: ['Avatar'], types: ['AvatarProps', 'AvatarSize'] },
]

function buildComponentIndex(specs: ComponentSpec[]): string {
  const specNames = new Set(specs.map((s) => s.name))
  const entries = BARREL_ENTRIES.filter((e) => specNames.has(e.name))
  const lines: string[] = []
  for (const entry of entries) {
    if (entry.values.length > 0) {
      lines.push(`export { ${entry.values.join(', ')} } from './${entry.dir}/${entry.dir}'`)
    }
    if (entry.types.length > 0) {
      lines.push(
        `export type { ${entry.types.join(', ')} } from './${entry.dir}/${entry.dir}.types'`,
      )
    }
  }
  return lines.join('\n') + '\n'
}

export function generate(config: ProjectConfig): GeneratedSystem {
  const generatedAt = new Date().toISOString()

  // Token layers
  const primitives = generatePrimitives(config)
  const semantic = generateSemanticTokens(primitives, config)
  const component = generateComponentTokens(semantic, config)

  // Component files and specs
  const componentFiles = generateComponents(config, { semantic, component })
  const componentSpecs = buildComponentSpecs(config)

  // Intermediate system used by doc generators (files not yet assembled)
  const interimSystem: GeneratedSystem = {
    config,
    tokens: { primitives, semantic, component },
    components: componentSpecs,
    files: [],
    metadata: { generatedAt, corrections: semantic.corrections },
  }

  const tokenFiles: GeneratedFile[] = [
    {
      path: 'tokens/primitives.json',
      content: serializeToW3C(primitives as unknown as TokenSet),
    },
    {
      path: 'tokens/semantic.json',
      content: serializeToW3C({
        colors: semantic.colors,
        typography: semantic.typography,
        spacing: semantic.spacing,
        radii: semantic.radii,
        shadows: semantic.shadows,
      } as unknown as TokenSet),
    },
    {
      path: 'tokens/component.json',
      content: serializeToW3C(component as unknown as TokenSet),
    },
    {
      path: 'tokens/variables.css',
      content: serializeToCSS(semantic, component, config.modes),
    },
    {
      path: 'tokens/tailwind.config.ts',
      content: serializeToTailwind(semantic),
    },
  ]

  const docFiles: GeneratedFile[] = [
    { path: 'docs/README.md', content: generateReadme(interimSystem, config) },
    { path: 'docs/tokens.md', content: generateTokensDoc(interimSystem) },
    { path: 'docs/components.md', content: generateComponentsDoc(interimSystem, config) },
    { path: 'docs/decisions.md', content: generateDecisions(config) },
    { path: 'docs/agent-spec.json', content: generateAgentSpec(interimSystem, config) },
  ]

  const metaFile: GeneratedFile = {
    path: '.design-system-meta.json',
    content: JSON.stringify(
      {
        version: '1.0',
        projectId: `ds-${config.color.primaryHex.slice(1).toLowerCase()}-${config.projectType}`,
        generatedAt,
        config,
      },
      null,
      2,
    ),
  }

  const allFiles: GeneratedFile[] = [
    ...tokenFiles,
    { path: 'components/index.ts', content: buildComponentIndex(componentSpecs) },
    ...componentFiles,
    ...docFiles,
    metaFile,
  ]

  return {
    config,
    tokens: { primitives, semantic, component },
    components: componentSpecs,
    files: allFiles,
    metadata: { generatedAt, corrections: semantic.corrections },
  }
}
