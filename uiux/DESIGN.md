---
name: Neural Ledger
colors:
  surface: '#0e1511'
  surface-dim: '#0e1511'
  surface-bright: '#343b36'
  surface-container-lowest: '#09100c'
  surface-container-low: '#161d19'
  surface-container: '#1a211d'
  surface-container-high: '#242c27'
  surface-container-highest: '#2f3632'
  on-surface: '#dde4dd'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#dde4dd'
  inverse-on-surface: '#2b322d'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#adc6ff'
  on-secondary: '#002e6a'
  secondary-container: '#0566d9'
  on-secondary-container: '#e6ecff'
  tertiary: '#ffb3af'
  on-tertiary: '#650911'
  tertiary-container: '#fc7c78'
  on-tertiary-container: '#711419'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3af'
  on-tertiary-fixed: '#410005'
  on-tertiary-fixed-variant: '#842225'
  background: '#0e1511'
  on-background: '#dde4dd'
  surface-variant: '#2f3632'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  mono-label:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  mono-code:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system is built for high-performance utility, targeting developers and power users managing local AI memory states. The aesthetic follows a **Technical Minimalism** approach, blending the precision of developer tools with the atmospheric depth of modern terminal interfaces.

The emotional response is one of **absolute control and clarity**. By utilizing a "Deep Dark" foundation, the UI recedes to prioritize data visualization and technical metadata. High-contrast emerald accents serve as "Ready" indicators and primary action points, creating a sense of system vitality and responsiveness. The design rejects unnecessary decoration in favor of structural integrity, subtle glows, and crisp borders.

## Colors

The color palette is engineered for prolonged use in dark environments, minimizing eye strain while maximizing legibility.

- **Background (#0b1326):** A deep, void-like slate that provides the infinite canvas for the dashboard.
- **Surface (#15203b):** Used for cards and containers to create a distinct secondary layer above the background.
- **Primary Accent (#10b981):** Representing system health and "Ready" states. Use this for successful statuses, primary buttons, and critical data points.
- **Borders (#1e293b):** Defines structure without creating visual noise. 
- **Typography:** High-contrast Slate 50 (#f8fafc) for readability, with Slate 400 (#94a3b8) reserved for secondary metadata and inactive states.

## Typography

This system employs a dual-font strategy to distinguish between user interface navigation and technical data.

- **Inter** handles all functional UI elements, headers, and descriptive text. It provides a neutral, highly legible sans-serif base that feels modern and unobtrusive.
- **JetBrains Mono** is used for "Technical Details"—including memory addresses, JSON payloads, logs, and status labels. This font signals to the user that the information is machine-generated or requires precise reading.

Large headlines should use tighter letter spacing to maintain a compact, "engineered" look. Data labels should always be rendered in JetBrains Mono to reinforce the developer-centric nature of the tool.

## Layout & Spacing

The layout follows a **Rigid Grid System** based on a 4px base unit. 

- **Desktop:** 12-column grid with 24px margins and 16px gutters.
- **Tablet:** 8-column grid with 20px margins.
- **Mobile:** 4-column grid with 16px margins.

The spacing rhythm is tight and dense, reflecting the information-rich nature of a dashboard. Group related technical data using 8px spacing, while separating major functional blocks (like Memory Banks vs. System Settings) with 32px of vertical space.

## Elevation & Depth

Depth is conveyed through **Tonal Layering** and **Subtle Glows** rather than traditional shadows.

1. **Level 0 (Background):** #0b1326.
2. **Level 1 (Surface):** #15203b with a 1px solid border of #1e293b.
3. **Level 2 (Active/Hover):** When an element is focused or active, it gains a subtle outer glow using the primary emerald color at 10-15% opacity (e.g., `0 0 12px rgba(16, 185, 129, 0.15)`).

Avoid heavy shadows. Instead, use thin borders and slightly lighter background fills to indicate hierarchy. Interaction is signified by increasing the border brightness or adding the emerald glow.

## Shapes

The shape language is **Soft-Geometric**. A base radius of 4px (`0.25rem`) is applied to most UI components to prevent the interface from feeling overly aggressive or dated, while maintaining a precise, technical edge.

- **Standard Elements (Buttons, Inputs, Cards):** 4px radius.
- **Interactive Tags/Chips:** 2px radius for a sharper, more data-driven look.
- **Status Indicators:** Perfect circles for "Ready" pulses.

## Components

### Buttons
- **Primary:** Background #10b981, Text #0b1326 (Bold). On hover, add a 4px emerald glow.
- **Ghost:** Border #1e293b, Text #f8fafc. Background becomes #15203b on hover.

### Status Indicators
- **Ready State:** A small #10b981 dot with a slow 2s pulse animation (expanding transparent circle) to indicate the AI memory is active and responsive.

### Inputs
- Background: #0b1326; Border: 1px solid #1e293b; Font: JetBrains Mono. Focus state: Border changes to #10b981 with a subtle glow.

### Cards
- Background: #15203b; Border: 1px solid #1e293b; Padding: 16px. Use for individual memory clusters or log entries.

### Terminal/Code Blocks
- Background: #0b1326 (inset look); Border: 1px solid #1e293b; Text: #94a3b8; Font: JetBrains Mono. Use for raw memory output or API logs.

### Memory Progress Bars
- Track: #1e293b; Fill: #10b981. No rounded caps (flush ends) to maintain the technical aesthetic.