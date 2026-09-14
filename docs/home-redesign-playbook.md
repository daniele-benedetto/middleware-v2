# Home Redesign Playbook

## Objective

Rework the public home (`/`) as an editorial dossier without replacing its content model, CMS controls, or established visual language. The desired outcome is a clearer, more compelling reading journey across desktop and mobile.

The home is not a generic marketing landing page. Do not introduce SaaS conventions such as nested cards, dashboard layouts, decorative gradients, generic icon tiles, or visual effects without editorial purpose.

## Installed Tool

Impeccable is installed locally for OpenCode in `.opencode/`.

1. Quit and restart OpenCode so it discovers the new project-local skill.
2. In a new OpenCode chat, run `/impeccable init`.
3. Answer only durable product-context questions. Keep the resulting `PRODUCT.md` factual and concise.
4. Run `/impeccable document` to capture the incumbent visual system in `DESIGN.md`.
5. Review both generated files before committing them. They must complement, not duplicate, `docs/architecture.md` and `docs/cms-ui.md`.

`PRODUCT.md`, `DESIGN.md`, `.impeccable/config.json`, `.impeccable/design.json`, surface briefs, and critique reports are shared artifacts when useful and may be committed. Runtime state, screenshots, and local overrides are ignored by `.gitignore`.

## Existing Home Model

### Route and shared composition

- `/` loads data through `lib/public/server/home.ts` and renders `components/public/pages/public-home-page.tsx`.
- `PublicHomePage` delegates to `PublicIssueDossierPage`.
- The dossier composition is also used by public issue pages. Changes to shared sections can therefore affect `/uscite/[slug]`.
- Before implementation, decide whether the new home should remain structurally identical to issue pages or receive a home-specific composition around shared editorial blocks.

### Content sequence

1. Public header, skip link, reading progress, footer, consent, and analytics come from `app/(public)/layout.tsx`.
2. `CurrentIssueHero` presents the current issue title, number, description, date, article count, and optional audio count.
3. `DossierHome` resolves the CMS-authored sequence of home blocks.
4. The archive displays prior published issues.

### CMS block grammar

The redesign must continue rendering configured blocks in their CMS order:

- `opening`: one leading article.
- `body`: a featured article plus secondary articles.
- `rupture`: one high-emphasis interruption.
- `closing`: one final article.
- `course`, `map`, `questionnaireAnalysis`, and `preview`: non-article editorial modules.

Do not change block validation, article assignment, featured placement, article numbering, fallback behavior, or omission of empty blocks as part of visual work. Those are content-model rules, not presentation defects.

### Incumbent visual truth

- Editorial and high contrast: cream background, black ink, red accent.
- Archivo is display/UI type; Spectral is long-form editorial type.
- Borders and grids create hierarchy; controls have restrained radius; shadows are absent.
- The responsive baseline collapses to one column below `768px`.
- Accessibility requires WCAG AA contrast, visible focus states, keyboard operation, and reduced-motion support.

The source of truth for these foundations is `docs/cms-ui.md` and `app/globals.css`. Preserve them unless a specific, reviewed problem requires a token change.

## Required Workflow

### 1. Establish a baseline

Run the application with representative published content. Inspect `/` and at least one `/uscite/[slug]` page at desktop and mobile widths. Capture the following before changing code:

- first viewport and the path to the first article;
- order and visual weight of every configured block;
- image-present and image-absent variants;
- one-, two-, and multi-article body blocks;
- default, red, and black issue variants;
- empty-current-issue and archive-only states.

Use the actual CMS content model. Do not assess the design from component source alone.

### 2. Critique the current experience

Run:

```text
/impeccable critique the public home route / and its shared dossier composition
```

Ask for findings ordered by impact. Evaluate:

- narrative hierarchy from issue identity to lead article to secondary content;
- first-viewport clarity and the reason to continue reading;
- rhythm between editorial block types;
- distinction between an article, a course, a map, a questionnaire, and an issue preview;
- scanability of titles, summaries, metadata, and article numbers;
- image cropping, absent-image layouts, and image-to-text balance;
- mobile reading flow, target sizes, and horizontal overflow;
- focus order, visible focus, semantic headings, alternative text, and reduced motion.

Do not edit while the critique is being produced.

### 3. Define the redesign boundary

Resolve this decision before implementation:

- **Shared dossier redesign:** improve `PublicIssueDossierPage` and dossier blocks. This updates both `/` and `/uscite/[slug]`.
- **Home-specific framing:** retain shared blocks but add or change composition only in `PublicHomePage`. This limits the redesign to `/`.

Choose the shared option only if issue pages should carry the same editorial journey. Prefer the narrowest option that accomplishes the approved goal.

### 4. Shape the direction before coding

Run this prompt:

```text
/impeccable shape Redesign the public home `/` as a Read-mode editorial dossier.

Preserve the existing cream/black/red system, Archivo + Spectral typography,
grid and border language, CMS-driven block order, article numbering, and all
current content types. Do not create a SaaS landing page, nested-card UI,
generic dashboard, gradients, or decoration without editorial value.

Analyse hierarchy, first viewport, rhythm, density, image/text balance,
distinction between block types, responsive reading flow, accessibility, and
the impact on `/uscite/[slug]`, which shares the dossier composition.

Produce: (1) ranked problems, (2) two conservative and implementable design
directions, (3) exact components and files affected, (4) desktop/mobile
behaviour, and (5) risks to CMS behavior. Do not edit files until a direction
is selected.
```

Select one direction. A valid direction changes hierarchy or reading rhythm with the existing system; it does not merely add decoration or swap colors.

### 5. Implement in narrow slices

Implement the selected direction in this order:

1. Establish or revise only the route-level composition required by the scope decision.
2. Refine the hero and first editorial block so the first viewport has a clear narrative entry.
3. Refine each dossier block while preserving its props, links, analytics payloads, and ordering contract.
4. Refine archive continuity and the transition from current issue to prior issues.
5. Make desktop and mobile layouts intentional rather than relying on accidental grid collapse.
6. Add motion only when it communicates hierarchy or navigation; preserve `prefers-reduced-motion`.

Use `/impeccable craft` only after the visual direction is approved. Read `docs/architecture.md` and the existing public component hierarchy before moving responsibilities between files. Keep public components data-only and do not move server loading into them.

### 6. Validate content variants and quality

Run:

```text
/impeccable audit the public home, dossier blocks, archive section, desktop and mobile
/impeccable polish the public home and shared dossier composition
```

Then verify manually:

- every CMS block type renders in its configured order;
- no article appears twice and article numbers remain stable;
- links and analytics sources/positions remain correct;
- all issue color variants preserve contrast;
- pages with no current issue still render the intended system and archive behavior;
- title, image, and metadata layouts survive missing optional fields;
- keyboard navigation and focus are visible;
- mobile has no horizontal scrolling and preserves reading order.

Run the repository checks relevant to the changed code:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
```

Run the full set only when the change scope warrants it:

```bash
pnpm check:all
```

## Useful Commands

```text
/impeccable init
/impeccable document
/impeccable critique the public home /
/impeccable shape the public home /
/impeccable layout the public home /
/impeccable typeset the public home /
/impeccable adapt the public home for mobile
/impeccable audit the public home /
/impeccable polish the public home /
```

Use one focused command at a time after the initial shape phase. Do not run `bolder`, `colorize`, `overdrive`, or `delight` by default: they can conflict with the restrained editorial identity.

## Completion Criteria

The redesign is complete when:

- the current issue and lead article are immediately understandable;
- each CMS-authored block has a distinct editorial role without breaking the shared system;
- the page feels composed as a dossier rather than assembled from generic cards;
- `/uscite/[slug]` has the intended relationship to `/`;
- mobile reading flow is deliberate and accessible;
- no data, CMS control, analytics event, SEO metadata, or public-route architecture regresses;
- code quality checks and visual inspection pass.
