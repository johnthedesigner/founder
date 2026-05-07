# Token Reference

This document lists every design token produced by the generator. Tokens are organized by layer. Reference each token in your CSS via the custom property name (e.g. `var(--color-action-primary)`).

---

## Layer 1 — Semantic Color Tokens

Semantic tokens express the *intent* of a color (action, surface, text, border, feedback) rather than the raw hue. They resolve to different values in light and dark mode.

| Token name | CSS custom property | Value |
|---|---|---|
| `color.action.primary` | `--color-action-primary` | `#123c82` |
| `color.action.primary.hover` | `--color-action-primary-hover` | `#0c2855` |
| `color.action.primary.fg` | `--color-action-primary-fg` | `#f8fafb` |
| `color.action.secondary` | `--color-action-secondary` | `#e8f0fa` |
| `color.action.secondary.fg` | `--color-action-secondary-fg` | `#0c0d0f` |
| `color.action.destructive` | `--color-action-destructive` | `#7d1515` |
| `color.action.destructive.fg` | `--color-action-destructive-fg` | `#f8fafb` |
| `color.surface.default` | `--color-surface-default` | `#f8fafb` |
| `color.surface.raised` | `--color-surface-raised` | `#ffffff` |
| `color.surface.overlay` | `--color-surface-overlay` | `#ffffff` |
| `color.surface.subtle` | `--color-surface-subtle` | `#e8f0fa` |
| `color.text.primary` | `--color-text-primary` | `#060708` |
| `color.text.secondary` | `--color-text-secondary` | `#304056` |
| `color.text.disabled` | `--color-text-disabled` | `#5a7191` |
| `color.text.on-action` | `--color-text-on-action` | `#f8fafb` |
| `color.border.default` | `--color-border-default` | `#c2cddd` |
| `color.border.strong` | `--color-border-strong` | `#5a7191` |
| `color.border.action` | `--color-border-action` | `#123c82` |
| `color.feedback.success` | `--color-feedback-success` | `#08491f` |
| `color.feedback.warning` | `--color-feedback-warning` | `#593805` |
| `color.feedback.error` | `--color-feedback-error` | `#7d1715` |
| `color.feedback.info` | `--color-feedback-info` | `#123c82` |

---

## Layer 2 — Typography Tokens

Typography tokens cover font families, the full type scale, font weights, and line heights.

| Token name | CSS custom property | Value |
|---|---|---|
| `font.family.display` | `--font-family-display` | `Inter` |
| `font.family.body` | `--font-family-body` | `Inter` |
| `font.family.ui` | `--font-family-ui` | `Inter` |
| `font.family.code` | `--font-family-code` | `JetBrains Mono` |
| `font.size.xs` | `--font-size-xs` | `0.64rem` |
| `font.size.sm` | `--font-size-sm` | `0.8rem` |
| `font.size.base` | `--font-size-base` | `1rem` |
| `font.size.lg` | `--font-size-lg` | `1.25rem` |
| `font.size.xl` | `--font-size-xl` | `1.563rem` |
| `font.size.2xl` | `--font-size-2xl` | `1.953rem` |
| `font.size.3xl` | `--font-size-3xl` | `2.441rem` |
| `font.size.4xl` | `--font-size-4xl` | `3.051rem` |
| `font.size.5xl` | `--font-size-5xl` | `3.814rem` |
| `font.weight.normal` | `--font-weight-normal` | `400` |
| `font.weight.medium` | `--font-weight-medium` | `500` |
| `font.weight.semibold` | `--font-weight-semibold` | `600` |
| `font.weight.bold` | `--font-weight-bold` | `700` |
| `font.line-height.tight` | `--font-line-height-tight` | `1.25` |
| `font.line-height.normal` | `--font-line-height-normal` | `1.5` |
| `font.line-height.relaxed` | `--font-line-height-relaxed` | `1.75` |

---

## Layer 3 — Spacing Tokens

| Token name | CSS custom property | Value |
|---|---|---|
| `space.component.xs` | `--space-component-xs` | `8px` |
| `space.component.sm` | `--space-component-sm` | `12px` |
| `space.component.md` | `--space-component-md` | `16px` |
| `space.component.lg` | `--space-component-lg` | `24px` |
| `space.component.xl` | `--space-component-xl` | `32px` |
| `space.layout.xs` | `--space-layout-xs` | `32px` |
| `space.layout.sm` | `--space-layout-sm` | `48px` |
| `space.layout.md` | `--space-layout-md` | `64px` |
| `space.layout.lg` | `--space-layout-lg` | `96px` |
| `space.layout.xl` | `--space-layout-xl` | `128px` |

---

## Layer 4 — Radii Tokens

| Token name | CSS custom property | Value |
|---|---|---|
| `radius.sm` | `--radius-sm` | `2px` |
| `radius.md` | `--radius-md` | `4px` |
| `radius.lg` | `--radius-lg` | `6px` |
| `radius.full` | `--radius-full` | `9999px` |

---

## Layer 5 — Shadow Tokens

| Token name | CSS custom property | Value |
|---|---|---|
| `shadow.sm` | `--shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` |
| `shadow.md` | `--shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)` |
| `shadow.lg` | `--shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.05)` |
