import type {
  ProjectConfig,
  SemanticTokenSet,
  ComponentTokenSet,
  GeneratedFile,
  ComponentCategory,
} from '@ds-gen/types'
import { generateButton } from './button'
import { generateInput } from './input'
import { generateSelect } from './select'
import { generateCheckbox } from './checkbox'
import { generateRadio } from './radio'
import { generateSwitch } from './switch'
import { generateDialog } from './dialog'
import { generateTooltip } from './tooltip'
import { generatePopover } from './popover'
import { generateTabs } from './tabs'
import { generateMenu } from './menu'
import { generateSlider } from './slider'
import { generateFormField } from './form-field'
import { generateCard } from './card'
import { generateBadge } from './badge'
import { generateAlert } from './alert'
import { generateAvatar } from './avatar'

const UTILS_CONTENT = `export function cn(...classes: Array<string | undefined | null | false>): string {
  return classes.filter(Boolean).join(' ')
}
`

const COMPONENT_CATEGORY: Record<string, ComponentCategory> = {
  button: 'forms',
  input: 'forms',
  select: 'forms',
  checkbox: 'forms',
  radio: 'forms',
  switch: 'forms',
  slider: 'forms',
  dialog: 'overlays',
  tooltip: 'overlays',
  popover: 'overlays',
  tabs: 'navigation',
  menu: 'navigation',
  'form-field': 'forms',
  card: 'data-display',
  badge: 'feedback',
  alert: 'feedback',
  avatar: 'data-display',
}

type ComponentGenerator = () => GeneratedFile[]

const GENERATORS: Record<string, ComponentGenerator> = {
  button: generateButton,
  input: generateInput,
  select: generateSelect,
  checkbox: generateCheckbox,
  radio: generateRadio,
  switch: generateSwitch,
  dialog: generateDialog,
  tooltip: generateTooltip,
  popover: generatePopover,
  tabs: generateTabs,
  menu: generateMenu,
  slider: generateSlider,
  'form-field': generateFormField,
  card: generateCard,
  badge: generateBadge,
  alert: generateAlert,
  avatar: generateAvatar,
}

export function generateComponents(
  config: ProjectConfig,
  tokens: { semantic: SemanticTokenSet; component: ComponentTokenSet },
): GeneratedFile[] {
  void tokens
  const scope = new Set(config.componentScope)
  const files: GeneratedFile[] = [
    { path: 'components/utils.ts', content: UTILS_CONTENT },
  ]

  for (const [name, generator] of Object.entries(GENERATORS)) {
    const category = COMPONENT_CATEGORY[name]
    if (category !== undefined && scope.has(category)) {
      files.push(...generator())
    }
  }

  return files
}
