---
name: Middleware V2
description: An Italian editorial publication and its precise CMS workbench.
colors:
  archive-paper: "#f7f0e7"
  paper-white: "#ffffff"
  ink: "#000000"
  vermilion-proof: "#c13814"
  text-body: "rgba(0, 0, 0, 0.82)"
  text-muted: "rgba(0, 0, 0, 0.62)"
  line: "rgba(0, 0, 0, 0.18)"
  hover: "rgba(193, 56, 20, 0.1)"
  success: "#1b7f3a"
  warning: "#b26a00"
typography:
  display:
    fontFamily: "Archivo, sans-serif"
    fontSize: "clamp(36px, 5vw, 68px)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Archivo, sans-serif"
    fontSize: "clamp(32px, 4.4vw, 52px)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Archivo, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.08
  body:
    fontFamily: "Spectral, serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Archivo, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.1em"
  control:
    fontFamily: "Archivo, sans-serif"
    fontSize: "14.5px"
    fontWeight: 700
  operational-label:
    fontFamily: "Archivo, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.1em"
  compact-body:
    fontFamily: "Archivo, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  dossier-number:
    fontFamily: "Archivo, sans-serif"
    fontSize: "40px"
    fontWeight: 900
    lineHeight: 0.78
    letterSpacing: "-0.04em"
  dossier-title:
    fontFamily: "Archivo, sans-serif"
    fontSize: "25px"
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: "-0.032em"
  dossier-body:
    fontFamily: "Spectral, serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  navigation:
    fontFamily: "Archivo, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    letterSpacing: "0.1em"
rounded:
  none: "0px"
  control: "6px"
  panel: "8px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  12: "48px"
  18: "72px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.archive-paper}"
    rounded: "{rounded.panel}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.archive-paper}"
    rounded: "{rounded.panel}"
  button-accent:
    backgroundColor: "{colors.vermilion-proof}"
    textColor: "{colors.archive-paper}"
    rounded: "{rounded.panel}"
    padding: "12px 20px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "10px 20px"
  surface-card:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "20px"
  dossier-card:
    backgroundColor: "{colors.archive-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "20px 0"
---

# Design System: Middleware V2

## Overview

**Creative North Star: "The Printed Dossier"**

Middleware V2 treats an Italian digital publication as an authored object: Archive Paper grounds the page, black rules establish the reading structure, and dense Archivo headlines give every issue a clear editorial voice. Spectral carries long-form reading with a quieter, literary cadence. The public experience makes the dossier and its content primary; the CMS preserves the same exacting grammar for operational work.

The system is flat by default and precise rather than polite. Borders, paper-to-white shifts, and a restrained Vermilion Proof mark do the work usually delegated to glossy surfaces. Responsive layouts retain the grid's logic while releasing multi-column structures into clear stacked reading order.

**Key Characteristics:**

- Material paper ground, firm black structure, and rare rust-red proof marks.
- Typography-led hierarchy with sans-serif display contrast and serif reading text.
- Compact, deliberate controls with visible, high-contrast keyboard focus.
- Editorial public surfaces and operational CMS surfaces drawn from one token system.

## Colors

The palette behaves like ink and correction marks on an uncoated archive sheet: neutral by default, with one decisive signal color.

### Primary

- **Vermilion Proof:** the rare editorial correction mark for article numbering, selection, destructive action, focus, and interaction rails.

### Neutral

- **Archive Paper:** the persistent page ground and light public reading surface.
- **Paper White:** the raised card and form surface that separates operational work from the page ground.
- **Printing Ink:** the structural foreground for type, rules, navigation, and primary actions.
- **Reading Ink:** the softened long-form body text, preserving contrast without competing with headings.
- **Quiet Ink:** secondary metadata, hints, and supporting context.
- **Section Rule:** the divider line for grids, rows, and dense CMS boundaries.

**The One Proof Rule.** Vermilion Proof marks attention, state, or consequence. It must not become a broad fill or a decorative field.

## Typography

**Display Font:** Archivo (with sans-serif fallback)
**Body Font:** Spectral (with serif fallback)

**Character:** Archivo is compressed, confident, and structural; Spectral makes sustained Italian reading feel composed rather than mechanical. Use their contrast to distinguish navigation and issue hierarchy from editorial prose.

### Hierarchy

- **Display:** strong Archivo display lettering for hero titles and issue-level moments; use the hero scale and tight display tracking.
- **Headline:** heavy Archivo headings for page and article hierarchy; reserve the responsive headline scale for primary page titles.
- **Title:** Archivo titles for cards, CMS panels, and section-level decisions.
- **Body:** Spectral editorial copy for articles, excerpts, and long reading; public article measure is capped at 860px.
- **Label:** uppercase, tracked Archivo metadata for dates, control labels, and compact CMS status language.

**The Type Does the Sorting Rule.** Establish hierarchy through family, weight, scale, and spacing before introducing color or ornamental treatment.

## Layout

Public content uses a centered full-width container capped at 96rem, with horizontal padding stepping from 16px on small viewports to 48px at large widths. The reading column caps at 860px. Dossiers use hard-rule grids: a fluid left rail from 180px to 320px, two-up listing grids, and asymmetric 3:2 layouts where the content calls for prominence.

The spacing vocabulary follows a compact 4px base through 72px. Keep information within a module tight and give issue sections a materially larger break. At 48rem and above, the header grows from 63px to 66px and editorial grids can reassemble; below it, retain sequence and remove columns rather than compressing content.

## Elevation & Depth

The system is flat by default. Borders, full-bleed paper fields, tonal hover fills, and inset interaction rails establish layers; general cards do not float. The only observed shadow vocabulary is an inset Vermilion Proof rail for selected or hovered editorial rows, plus a small practical map-pin shadow.

**The Flat-By-Default Rule.** Do not add soft floating shadows, glass effects, or blur to manufacture hierarchy. A rule, tonal shift, or stateful inset rail is the native depth language.

## Shapes

Public editorial composition is square and rule-led. CMS controls and panels use gently curved 6px controls and 8px panels to make dense operations approachable without losing the system's precision. Pills are reserved for true circular map-pin details, not general navigation or tags.

## Components

### Buttons

- **Shape:** CMS actions use restrained rounded panels; public text actions may reduce to a square, underlined rule.
- **Primary:** Printing Ink fill with Archive Paper text; accent actions use Vermilion Proof for irreversible or selected emphasis.
- **Hover / Focus:** dark fills dim slightly; outlined controls take a tonal hover fill. Every keyboard focus state uses a 3px Vermilion Proof outline with a 2px offset.
- **Secondary / Ghost:** outlines retain a Printing Ink boundary; ghost actions are text-first with an underline or border shift rather than a container.

### Cards / Containers

- **Corner Style:** public dossier cards are square; CMS surfaces use the panel radius.
- **Background:** Archive Paper remains the public field, while Paper White distinguishes cards and data-entry panels.
- **Shadow Strategy:** flat, using borders and the stateful inset rail rather than elevation.
- **Border:** Printing Ink rules are the standard structural boundary.
- **Internal Padding:** CMS surfaces run from 14px to 24px; dossier cards use generous vertical rhythm and grid boundaries.

### Inputs / Fields

- **Style:** Paper White or transparent fields, Printing Ink borders, and compact Archivo control text.
- **Focus:** the global Vermilion Proof outline is the focus indicator, not a glow.
- **Error / Disabled:** errors use Vermilion Proof text and invalid state; disabled controls lower contrast without changing the layout.

### Navigation

- **Style:** sticky public header with a 2px black lower rule, paper background, and Archivo labels. The menu control remains text-forward with a drawn icon; its open state moves into a dark, high-contrast menu context.

### Dossier Article Card

Public article cards are linked editorial units, not generic panels: large Vermilion Proof numbering, heavy Archivo title, optional framed image, Spectral excerpt, and metadata are held by the grid. On desktop hover, a 4px inset accent rail and subtle surface tint signal the target; image movement is limited to a 1.035 scale.

## Do's and Don'ts

### Do:

- **Do** preserve Archive Paper as the broad public ground and let Paper White indicate a contained operational surface.
- **Do** use black rules to make grids, reading order, and interaction boundaries visible.
- **Do** reserve Vermilion Proof for attention, focus, selection, destructive intent, and editorial numbering.
- **Do** pair Archivo hierarchy with Spectral editorial reading text.
- **Do** keep public dossier cards square and use the 6px and 8px radii only for controls and CMS panels.

### Don't:

- **Don't** add glossy dashboard chrome: gradients, glass blur, decorative shadows, or pill-heavy controls do not belong here.
- **Don't** turn every content unit into a rounded card; preserve the dossier's rule-led grid.
- **Don't** use the accent as a broad background color or a substitute for typographic hierarchy.
- **Don't** replace visible focus outlines with subtle color-only hover treatment.
