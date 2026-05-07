# Component Reference

This design system includes **10 components**. Each component uses CSS custom properties for all visual tokens, making them easy to theme.

All components require `@base-ui-components/react` for interactive primitives.

---

# Forms Components

## Button

Use primary for the main call-to-action. Use secondary for supporting actions. Use ghost for low-emphasis inline actions. Use destructive for irreversible actions.

**Base UI primitive:** `@base-ui-components/react/button`

**Variants:** `primary`, `secondary`, `ghost`, `destructive`

**Sizes:** `sm`, `md`, `lg`

**Token references:**
- `--color-action-primary`
- `--color-action-primary-fg`
- `--button-padding-md`
- `--button-border-radius`
- `--button-font-weight`

**Accessibility:**
Meets WCAG AA contrast for all variants. Focus ring visible via focus-visible. Disabled state uses opacity-50 and pointer-events-none.

**Import:**
```tsx
import { Button } from './components/button/button'
```

---

## Input

Always wrap in FormField to provide an accessible label. Use the error prop on FormField to display validation messages.

**Base UI primitive:** `@base-ui-components/react/input`

**Token references:**
- `--input-background`
- `--input-border-color`
- `--input-border-color-focus`
- `--input-color`
- `--input-padding`
- `--input-border-radius`
- `--input-font-size`

**Accessibility:**
Focus ring visible via focus-visible. Pair with FormField for label and error message accessibility.

**Import:**
```tsx
import { Input } from './components/input/input'
```

---

## Select

Use for choosing from a list of 5 or more options. For fewer options, prefer Radio.

**Base UI primitive:** `@base-ui-components/react/select`

**Token references:**
- `--select-background`
- `--select-border-color`
- `--select-border-radius`
- `--select-font-size`

**Accessibility:**
Uses Base UI Select which manages ARIA roles and keyboard navigation automatically.

**Import:**
```tsx
import { Select } from './components/select/select'
```

---

## Checkbox

Use for independent boolean options. Use a group of checkboxes for multi-select from a list.

**Base UI primitive:** `@base-ui-components/react/checkbox`

**Token references:**
- `--checkbox-size`
- `--checkbox-border-radius`
- `--checkbox-border-color`
- `--checkbox-color-checked`
- `--checkbox-color-checked-fg`

**Accessibility:**
Checked state indicated via data-[checked] attribute. Focus ring visible via focus-visible.

**Import:**
```tsx
import { Checkbox } from './components/checkbox/checkbox'
```

---

## Radio

Always wrap in a labeled RadioGroup. Use when only one option can be selected from a list.

**Base UI primitive:** `@base-ui-components/react/radio`

**Token references:**
- `--radio-size`
- `--radio-border-color`
- `--radio-color-checked`
- `--radio-gap`

**Accessibility:**
Checked state indicated via data-[checked] attribute. Wrap in a RadioGroup for proper ARIA grouping.

**Import:**
```tsx
import { Radio } from './components/radio/radio'
```

---

## Switch

Use for immediate binary toggles that take effect without a form submit.

**Base UI primitive:** `@base-ui-components/react/switch`

**Token references:**
- `--switch-height`
- `--switch-width`
- `--switch-border-radius`
- `--switch-color-checked`
- `--switch-color-unchecked`
- `--switch-thumb-background`

**Accessibility:**
Checked state indicated via data-[checked] attribute. Rendered as a native button with role="switch" via Base UI.

**Import:**
```tsx
import { Switch } from './components/switch/switch'
```

---

## Slider

Use for selecting a value within a continuous range. Provide visible min/max labels for context.

**Base UI primitive:** `@base-ui-components/react/slider`

**Token references:**
- `--slider-track-height`
- `--slider-track-background`
- `--slider-thumb-size`
- `--slider-range-color`

**Accessibility:**
Keyboard navigable via arrow keys. Value announced by screen readers via aria-valuenow.

**Import:**
```tsx
import { Slider } from './components/slider/slider'
```

---

## Form Field

Always wrap form inputs in FormField. Pass the error message string to show validation state.

**Base UI primitive:** `@base-ui-components/react/field`

**Token references:**
- `--form-field-gap`
- `--form-field-label-font-size`
- `--form-field-label-color`
- `--form-field-hint-color`
- `--form-field-error-color`

**Accessibility:**
Label is associated with the field via aria-labelledby. Error messages are associated via aria-describedby. Required indicator is hidden from screen readers.

**Import:**
```tsx
import { FormField } from './components/form-field/form-field'
```


---

# Navigation Components

## Tabs

Use to divide content into parallel sections of the same hierarchy. Avoid nesting tabs.

**Base UI primitive:** `@base-ui-components/react/tabs`

**Token references:**
- `--tabs-border-color`
- `--tab-color-active`
- `--tab-color-inactive`
- `--tab-font-size`
- `--tab-font-weight-active`
- `--tab-padding`

**Accessibility:**
Arrow keys navigate between tabs. Active tab panel is linked via aria-controls.

**Import:**
```tsx
import { Tabs } from './components/tabs/tabs'
```

---

## Menu

Use for contextual actions accessible from a trigger button. Keep items under 10 for usability.

**Base UI primitive:** `@base-ui-components/react/menu`

**Token references:**
- `--menu-background`
- `--menu-border-color`
- `--menu-border-radius`
- `--menu-item-padding`
- `--menu-item-color-hover`

**Accessibility:**
Arrow keys navigate menu items. Escape closes the menu. Items have role="menuitem".

**Import:**
```tsx
import { Menu } from './components/menu/menu'
```

