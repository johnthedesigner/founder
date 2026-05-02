import type { ProjectConfig, ComponentSpec, ComponentCategory } from '@ds-gen/types'

const ALL_SPECS: ComponentSpec[] = [
  {
    name: 'Button',
    importPath: 'components/button',
    baseUIComponent: '@base-ui-components/react/button',
    variants: ['primary', 'secondary', 'ghost', 'destructive'],
    sizes: ['sm', 'md', 'lg'],
    defaultVariant: 'primary',
    defaultSize: 'md',
    tokenRefs: [
      '--color-action-primary',
      '--color-action-primary-fg',
      '--button-padding-md',
      '--button-border-radius',
      '--button-font-weight',
    ],
    accessibilityNotes:
      'Meets WCAG AA contrast for all variants. Focus ring visible via focus-visible. Disabled state uses opacity-50 and pointer-events-none.',
    usageGuidance:
      'Use primary for the main call-to-action. Use secondary for supporting actions. Use ghost for low-emphasis inline actions. Use destructive for irreversible actions.',
  },
  {
    name: 'Input',
    importPath: 'components/input',
    baseUIComponent: '@base-ui-components/react/input',
    variants: [],
    sizes: [],
    defaultVariant: '',
    defaultSize: '',
    tokenRefs: [
      '--input-background',
      '--input-border-color',
      '--input-border-color-focus',
      '--input-color',
      '--input-padding',
      '--input-border-radius',
      '--input-font-size',
    ],
    accessibilityNotes:
      'Focus ring visible via focus-visible. Pair with FormField for label and error message accessibility.',
    usageGuidance:
      'Always wrap in FormField to provide an accessible label. Use the error prop on FormField to display validation messages.',
  },
  {
    name: 'Select',
    importPath: 'components/select',
    baseUIComponent: '@base-ui-components/react/select',
    variants: [],
    sizes: [],
    defaultVariant: '',
    defaultSize: '',
    tokenRefs: [
      '--select-background',
      '--select-border-color',
      '--select-border-radius',
      '--select-font-size',
    ],
    accessibilityNotes:
      'Uses Base UI Select which manages ARIA roles and keyboard navigation automatically.',
    usageGuidance:
      'Use for choosing from a list of 5 or more options. For fewer options, prefer Radio.',
  },
  {
    name: 'Checkbox',
    importPath: 'components/checkbox',
    baseUIComponent: '@base-ui-components/react/checkbox',
    variants: [],
    sizes: [],
    defaultVariant: '',
    defaultSize: '',
    tokenRefs: [
      '--checkbox-size',
      '--checkbox-border-radius',
      '--checkbox-border-color',
      '--checkbox-color-checked',
      '--checkbox-color-checked-fg',
    ],
    accessibilityNotes:
      'Checked state indicated via data-[checked] attribute. Focus ring visible via focus-visible.',
    usageGuidance:
      'Use for independent boolean options. Use a group of checkboxes for multi-select from a list.',
  },
  {
    name: 'Radio',
    importPath: 'components/radio',
    baseUIComponent: '@base-ui-components/react/radio',
    variants: [],
    sizes: [],
    defaultVariant: '',
    defaultSize: '',
    tokenRefs: [
      '--radio-size',
      '--radio-border-color',
      '--radio-color-checked',
      '--radio-gap',
    ],
    accessibilityNotes:
      'Checked state indicated via data-[checked] attribute. Wrap in a RadioGroup for proper ARIA grouping.',
    usageGuidance:
      'Always wrap in a labeled RadioGroup. Use when only one option can be selected from a list.',
  },
  {
    name: 'Switch',
    importPath: 'components/switch',
    baseUIComponent: '@base-ui-components/react/switch',
    variants: [],
    sizes: [],
    defaultVariant: '',
    defaultSize: '',
    tokenRefs: [
      '--switch-height',
      '--switch-width',
      '--switch-border-radius',
      '--switch-color-checked',
      '--switch-color-unchecked',
      '--switch-thumb-background',
    ],
    accessibilityNotes:
      'Checked state indicated via data-[checked] attribute. Rendered as a native button with role="switch" via Base UI.',
    usageGuidance:
      'Use for immediate binary toggles that take effect without a form submit.',
  },
  {
    name: 'Slider',
    importPath: 'components/slider',
    baseUIComponent: '@base-ui-components/react/slider',
    variants: [],
    sizes: [],
    defaultVariant: '',
    defaultSize: '',
    tokenRefs: [
      '--slider-track-height',
      '--slider-track-background',
      '--slider-thumb-size',
      '--slider-range-color',
    ],
    accessibilityNotes:
      'Keyboard navigable via arrow keys. Value announced by screen readers via aria-valuenow.',
    usageGuidance:
      'Use for selecting a value within a continuous range. Provide visible min/max labels for context.',
  },
  {
    name: 'Dialog',
    importPath: 'components/dialog',
    baseUIComponent: '@base-ui-components/react/dialog',
    variants: [],
    sizes: [],
    defaultVariant: '',
    defaultSize: '',
    tokenRefs: [
      '--dialog-background',
      '--dialog-border-radius',
      '--dialog-padding',
      '--dialog-shadow',
      '--overlay-background',
    ],
    accessibilityNotes:
      "Focus is trapped inside the dialog when open. Dismissible via Escape key. Backdrop click closes by default.",
    usageGuidance:
      "Use for tasks that require the user's full attention. Prefer a sheet or drawer for mobile contexts.",
  },
  {
    name: 'Tooltip',
    importPath: 'components/tooltip',
    baseUIComponent: '@base-ui-components/react/tooltip',
    variants: [],
    sizes: [],
    defaultVariant: '',
    defaultSize: '',
    tokenRefs: [
      '--tooltip-background',
      '--tooltip-color',
      '--tooltip-border-radius',
      '--tooltip-font-size',
      '--tooltip-padding',
    ],
    accessibilityNotes:
      'Tooltip content is announced to screen readers. Do not place interactive content inside tooltips.',
    usageGuidance:
      'Use to label icon-only buttons or explain non-obvious UI. Keep content short (under 10 words).',
  },
  {
    name: 'Popover',
    importPath: 'components/popover',
    baseUIComponent: '@base-ui-components/react/popover',
    variants: [],
    sizes: [],
    defaultVariant: '',
    defaultSize: '',
    tokenRefs: [
      '--popover-background',
      '--popover-border-color',
      '--popover-border-radius',
      '--popover-padding',
      '--popover-shadow',
    ],
    accessibilityNotes:
      'Focus moves to the popover on open. Dismissible via Escape key. Manages aria-expanded on the trigger.',
    usageGuidance:
      'Use for secondary actions or contextual information that needs more space than a tooltip.',
  },
  {
    name: 'Tabs',
    importPath: 'components/tabs',
    baseUIComponent: '@base-ui-components/react/tabs',
    variants: [],
    sizes: [],
    defaultVariant: '',
    defaultSize: '',
    tokenRefs: [
      '--tabs-border-color',
      '--tab-color-active',
      '--tab-color-inactive',
      '--tab-font-size',
      '--tab-font-weight-active',
      '--tab-padding',
    ],
    accessibilityNotes:
      'Arrow keys navigate between tabs. Active tab panel is linked via aria-controls.',
    usageGuidance:
      'Use to divide content into parallel sections of the same hierarchy. Avoid nesting tabs.',
  },
  {
    name: 'Menu',
    importPath: 'components/menu',
    baseUIComponent: '@base-ui-components/react/menu',
    variants: [],
    sizes: [],
    defaultVariant: '',
    defaultSize: '',
    tokenRefs: [
      '--menu-background',
      '--menu-border-color',
      '--menu-border-radius',
      '--menu-item-padding',
      '--menu-item-color-hover',
    ],
    accessibilityNotes:
      'Arrow keys navigate menu items. Escape closes the menu. Items have role="menuitem".',
    usageGuidance:
      'Use for contextual actions accessible from a trigger button. Keep items under 10 for usability.',
  },
  {
    name: 'Form Field',
    importPath: 'components/form-field',
    baseUIComponent: '@base-ui-components/react/field',
    variants: [],
    sizes: [],
    defaultVariant: '',
    defaultSize: '',
    tokenRefs: [
      '--form-field-gap',
      '--form-field-label-font-size',
      '--form-field-label-color',
      '--form-field-hint-color',
      '--form-field-error-color',
    ],
    accessibilityNotes:
      'Label is associated with the field via aria-labelledby. Error messages are associated via aria-describedby. Required indicator is hidden from screen readers.',
    usageGuidance:
      'Always wrap form inputs in FormField. Pass the error message string to show validation state.',
  },
  {
    name: 'Card',
    importPath: 'components/card',
    baseUIComponent: '',
    variants: [],
    sizes: [],
    defaultVariant: '',
    defaultSize: '',
    tokenRefs: [
      '--card-background',
      '--card-border-color',
      '--card-border-radius',
      '--card-padding',
      '--card-shadow',
    ],
    accessibilityNotes:
      'Semantic structure is the responsibility of the card content. Use appropriate heading levels within CardHeader.',
    usageGuidance:
      'Use CardHeader for title content, CardBody for the main content, and CardFooter for actions.',
  },
  {
    name: 'Badge',
    importPath: 'components/badge',
    baseUIComponent: '',
    variants: ['default', 'success', 'warning', 'error', 'info'],
    sizes: [],
    defaultVariant: 'default',
    defaultSize: '',
    tokenRefs: [
      '--badge-border-radius',
      '--badge-padding',
      '--badge-font-size',
      '--badge-font-weight',
    ],
    accessibilityNotes:
      'Conveys status visually. Ensure status is also communicated via text or aria-label, not color alone.',
    usageGuidance:
      'Use to label the status or category of an item. Keep badge text under 20 characters.',
  },
  {
    name: 'Alert',
    importPath: 'components/alert',
    baseUIComponent: '',
    variants: ['info', 'success', 'warning', 'error'],
    sizes: [],
    defaultVariant: 'info',
    defaultSize: '',
    tokenRefs: ['--alert-border-radius', '--alert-padding'],
    accessibilityNotes:
      'Use role="alert" for urgent messages. Use role="status" for non-urgent updates.',
    usageGuidance:
      "Use to communicate page-level feedback. For field-level errors, use FormField's error prop instead.",
  },
  {
    name: 'Avatar',
    importPath: 'components/avatar',
    baseUIComponent: '',
    variants: [],
    sizes: ['sm', 'md', 'lg'],
    defaultVariant: '',
    defaultSize: 'md',
    tokenRefs: [
      '--avatar-size-sm',
      '--avatar-size-md',
      '--avatar-size-lg',
      '--avatar-border-radius',
      '--avatar-background',
      '--avatar-color',
    ],
    accessibilityNotes:
      'Provide alt text on the image. Initials fallback is hidden from screen readers when the image is present.',
    usageGuidance:
      'Use src and alt for user photos. Provide initials as a fallback when no image is available.',
  },
]

const SPEC_CATEGORY: Record<string, ComponentCategory> = {
  Button: 'forms',
  Input: 'forms',
  Select: 'forms',
  Checkbox: 'forms',
  Radio: 'forms',
  Switch: 'forms',
  Slider: 'forms',
  'Form Field': 'forms',
  Dialog: 'overlays',
  Tooltip: 'overlays',
  Popover: 'overlays',
  Tabs: 'navigation',
  Menu: 'navigation',
  Card: 'data-display',
  Badge: 'feedback',
  Alert: 'feedback',
  Avatar: 'data-display',
}

export function buildComponentSpecs(config: ProjectConfig): ComponentSpec[] {
  const scope = new Set(config.componentScope)
  return ALL_SPECS.filter((spec) => {
    const cat = SPEC_CATEGORY[spec.name]
    return cat !== undefined && scope.has(cat)
  })
}
