# Aethos Memory — Brand Guide

## Quick reference
Technical minimalism. Feels like a developer tool, not a consumer app — calm, quiet, information-dense, dark by default. Reference points: Linear, Supabase Studio, Vercel's dashboard.

## Voice & tone
- Personality: precise, unobtrusive, utilitarian. Nothing decorative or "marketing-glossy."
- Talks to the user the way a well-built internal tool does — plainly, without hand-holding, without celebratory microcopy. Respects that the audience is technical and wants to see what's actually happening (e.g. a "Skip to JSON config" option alongside the guided setup wizard, rather than forcing everyone through hand-holding).

## Color palette
**[RESOLVED: navy-blue palette confirmed and implemented]**

The palette conflict between the original DESIGN.md YAML front-matter (green-black `#0e1511`)
and the delivered mockups (navy-blue `#0b1326`) has been resolved in favor of navy-blue,
since more surfaces already used it and it matches the Linear/Vercel reference aesthetic more closely.

All dashboard pages and `globals.css` now use this palette consistently:
- Background: `#0b1326`
- Surface (cards/containers): `#15203b`
- Primary accent: `#10b981` (emerald — ready/success states, primary buttons, key data points)
- Borders: `#1e293b`
- Text: `#f8fafc` (primary), `#94a3b8` (secondary/metadata/inactive)

## Typography
- Heading/body/UI text: **Inter**.
- Technical/data content specifically (memory content, logs, JSON payloads, status labels): **JetBrains Mono** — signals to the user that something is machine-generated or needs precise reading.
- Large headlines use tighter letter spacing for a compact, "engineered" look.

## UI conventions
- Dark by default, developer-tool density rather than consumer spaciousness.
- Corners: 4px radius on standard elements (buttons, inputs, cards); 2px (sharper) on tags/chips; perfect circles for status indicators.
- Spacing: 4px base unit, 24px container padding, 16px gutters; tight rhythm reflecting an information-dense dashboard.
- Elevation via subtle glow (emerald accent at low opacity) on hover/focus/active states, not heavy drop shadows.
- Fast interactions expected: inline edit, no unnecessary confirmation modals — except delete, which always confirms, since it's irreversible.
- Known issues to fix, found reviewing the actual mockups against these conventions: plain white input fields on the Settings and onboarding screens break the otherwise all-dark UI; the sidebar/top-bar aren't yet a single shared, reusable app-shell component (each page currently has a slightly different header and sidebar); the delete-confirmation warning on the edit panel currently shows permanently instead of only after delete is clicked.

## Reference points
- **Linear** — the calm, fast, uncluttered feel of the interface generally (not any specific screen or feature).
- **Supabase Studio** — density and directness of a raw data-browsing tool; part of why the dashboard doesn't need to be more elaborate than it is for viewing/editing memories.
- **Vercel's dashboard** — the general aesthetic register being aimed for: technical, clean, unglamorous.
