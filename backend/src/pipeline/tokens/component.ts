import type {
  ProjectConfig,
  SemanticTokenSet,
  ComponentTokenSet,
} from '@ds-gen/types'

// All values are semantic token names — never primitive names or raw px values.
// The semantic layer resolves these to actual values at render time.

export function generateComponentTokens(
  semantic: SemanticTokenSet,
  config: ProjectConfig,
): ComponentTokenSet {
  void semantic
  void config
  return {
    button: {
      'button.padding.sm': 'space.component.xs space.component.sm',
      'button.padding.md': 'space.component.sm space.component.md',
      'button.padding.lg': 'space.component.md space.component.lg',
      'button.border-radius': 'radius.md',
      'button.font-weight': 'font.weight.semibold',
      'button.font-size.sm': 'font.size.sm',
      'button.font-size.md': 'font.size.base',
      'button.font-size.lg': 'font.size.lg',
      'button.color.primary': 'color.action.primary',
      'button.color.primary.fg': 'color.action.primary.fg',
      'button.color.primary.hover': 'color.action.primary.hover',
      'button.color.secondary': 'color.action.secondary',
      'button.color.secondary.fg': 'color.action.secondary.fg',
      'button.color.destructive': 'color.action.destructive',
      'button.color.destructive.fg': 'color.action.destructive.fg',
    },

    input: {
      'input.padding': 'space.component.sm space.component.md',
      'input.border-radius': 'radius.md',
      'input.border-color': 'color.border.default',
      'input.border-color.focus': 'color.border.action',
      'input.font-size': 'font.size.base',
      'input.background': 'color.surface.raised',
      'input.color': 'color.text.primary',
      'input.color.placeholder': 'color.text.disabled',
    },

    select: {
      'select.padding': 'space.component.sm space.component.md',
      'select.border-radius': 'radius.md',
      'select.border-color': 'color.border.default',
      'select.border-color.focus': 'color.border.action',
      'select.font-size': 'font.size.base',
      'select.background': 'color.surface.raised',
      'select.color': 'color.text.primary',
    },

    checkbox: {
      'checkbox.size': 'space.component.md',
      'checkbox.border-radius': 'radius.sm',
      'checkbox.border-color': 'color.border.strong',
      'checkbox.color.checked': 'color.action.primary',
      'checkbox.color.checked.fg': 'color.action.primary.fg',
      'checkbox.color.unchecked': 'color.surface.raised',
    },

    radio: {
      'radio.size': 'space.component.md',
      'radio.border-color': 'color.border.strong',
      'radio.color.checked': 'color.action.primary',
      'radio.color.unchecked': 'color.surface.raised',
    },

    switch: {
      'switch.width': 'space.component.xl',
      'switch.height': 'space.component.lg',
      'switch.border-radius': 'radius.full',
      'switch.color.checked': 'color.action.primary',
      'switch.color.unchecked': 'color.border.default',
      'switch.thumb.border-radius': 'radius.full',
    },

    dialog: {
      'dialog.padding': 'space.component.xl',
      'dialog.border-radius': 'radius.lg',
      'dialog.background': 'color.surface.overlay',
      'dialog.shadow': 'shadow.lg',
      'dialog.overlay.background': 'color.text.primary',
    },

    tooltip: {
      'tooltip.padding': 'space.component.xs space.component.sm',
      'tooltip.border-radius': 'radius.sm',
      'tooltip.background': 'color.text.primary',
      'tooltip.color': 'color.surface.default',
      'tooltip.font-size': 'font.size.xs',
    },

    popover: {
      'popover.padding': 'space.component.md',
      'popover.border-radius': 'radius.lg',
      'popover.background': 'color.surface.overlay',
      'popover.border-color': 'color.border.default',
      'popover.shadow': 'shadow.md',
    },

    tabs: {
      'tabs.padding': 'space.component.sm space.component.md',
      'tabs.border-color.active': 'color.border.action',
      'tabs.color.active': 'color.action.primary',
      'tabs.color.inactive': 'color.text.secondary',
      'tabs.font-weight.active': 'font.weight.semibold',
      'tabs.font-weight.inactive': 'font.weight.normal',
    },

    menu: {
      'menu.padding': 'space.component.xs',
      'menu.border-radius': 'radius.md',
      'menu.background': 'color.surface.overlay',
      'menu.shadow': 'shadow.md',
      'menu.item.padding': 'space.component.xs space.component.md',
      'menu.item.color.hover': 'color.surface.subtle',
      'menu.item.font-size': 'font.size.base',
    },

    slider: {
      'slider.track-height': 'space.component.xs',
      'slider.thumb-size': 'space.component.md',
      'slider.border-radius': 'radius.full',
      'slider.color.track': 'color.border.default',
      'slider.color.fill': 'color.action.primary',
      'slider.color.thumb': 'color.action.primary',
      'slider.color.thumb.border': 'color.surface.raised',
    },

    'form-field': {
      'form-field.gap': 'space.component.sm',
      'form-field.label.font-size': 'font.size.sm',
      'form-field.label.font-weight': 'font.weight.medium',
      'form-field.label.color': 'color.text.primary',
      'form-field.error.color': 'color.action.destructive',
      'form-field.error.font-size': 'font.size.sm',
      'form-field.hint.color': 'color.text.secondary',
    },

    card: {
      'card.padding': 'space.component.xl',
      'card.border-radius': 'radius.lg',
      'card.background': 'color.surface.raised',
      'card.border-color': 'color.border.default',
      'card.shadow': 'shadow.sm',
    },

    badge: {
      'badge.padding': 'space.component.xs space.component.sm',
      'badge.border-radius': 'radius.full',
      'badge.font-size': 'font.size.xs',
      'badge.font-weight': 'font.weight.medium',
    },

    alert: {
      'alert.padding': 'space.component.md space.component.lg',
      'alert.border-radius': 'radius.md',
      'alert.font-size': 'font.size.sm',
      'alert.color.success': 'color.feedback.success',
      'alert.color.warning': 'color.feedback.warning',
      'alert.color.error': 'color.feedback.error',
      'alert.color.info': 'color.feedback.info',
    },

    avatar: {
      'avatar.size.sm': 'space.component.lg',
      'avatar.size.md': 'space.component.xl',
      'avatar.size.lg': 'space.layout.xs',
      'avatar.border-radius': 'radius.full',
      'avatar.background': 'color.surface.subtle',
      'avatar.color': 'color.text.secondary',
    },
  }
}
