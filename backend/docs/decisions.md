# Design Decisions

This document explains the rationale behind each major design decision in this system. These decisions were derived from the `ProjectConfig` and are specific to this generation run.

---

## Type Scale

**Configuration:** typeStyle = `geometric`, scaleRatio = `1.25`, displayFace = `Inter`, bodyFace = `Inter`

The type scale uses a geometric sans-serif (Inter) with a modular scale ratio of 1.25. Geometric faces provide clean, neutral letterforms well-suited to data-dense interfaces. The scale ratio produces distinct, harmonious size steps without feeling cramped or exaggerated.

The display face (`Inter`) is used for headings (font.family.display). The body face (`Inter`) is used for UI text and body copy (font.family.body, font.family.ui). The code face (`JetBrains Mono`) is used for monospaced content.

---

## Border Radius

**Configuration:** personality = `professional`

Border radii use a restrained professional scale (2px base, up to 4px for cards). Subtle rounding softens the interface without compromising the perception of reliability and precision.

The full border radius scale (radius.none, radius.sm, radius.md, radius.lg, radius.full) is derived from this personality setting. Components reference semantic radius tokens rather than hard-coded values, so changing the personality in a future regeneration updates all components consistently.

---

## Color Approach

**Configuration:** primaryHex = `#3b82f6`, colorDirection = `cool-professional`, neutralFamily = `slate`

The color direction is cool-professional. Primary colors skew blue-to-indigo, producing a palette associated with trust, reliability, and expertise. Neutral tones are cool-leaning to reinforce the professional feel.

The primary color scale is generated algorithmically from the seed `#3b82f6` by targeting specific contrast ratios at each of the 19 shade steps (50–950). This produces scales that are perceptually uniform and accessible: shades 600+ reliably pass WCAG AA contrast against white, and shades 400 and below pass against dark backgrounds.

The neutral family (`slate`) was selected to complement the primary hue direction. Neutrals are used for surfaces, borders, and secondary text.

---

## Spacing Density

**Configuration:** density = `balanced`

Spacing density is balanced (4px base unit). A 4px grid strikes the most common trade-off between information density and visual breathing room.

Component spacing (padding, gap, inner margins) derives from the component-level spacing tokens (space.component.xs through space.component.xl). Layout spacing (section gaps, page margins) derives from the layout-level spacing tokens (space.layout.xs through space.layout.xl).

---

## Shadow and Depth

**Configuration:** dimensionality = `subtle`

Shadow dimensionality is subtle: light drop shadows are used to distinguish raised surfaces (cards, dropdowns, modals) from the page background. Shadows are perceptible but do not distract.
