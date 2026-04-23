# CMS UI Audit vs Style Guide (Task 2.6)

Last update: 2026-04-23

Reference:

- `docs/Middleware Style Guide.html`
- `docs/cms-ui.md`

Scope:

- CMS routes and components under `app/(cms)`, `components/cms`, `features/cms`, and shared UI primitives currently used by CMS.

## 1) Status

Overall status: **largely aligned**. Remaining items are tracked below.

## 2) Closed (delivered)

- Global palette, semantic tokens, typography scale, line-heights and spacing tokens aligned to SG and wired through `app/globals.css` (`@theme inline`).
- CMS components use semantic tokens — zero hardcoded hex values in `components/cms/*` and `features/cms/*`.
- Typography (`Archivo Black` / `Newsreader` / `IBM Plex Mono`) and editorial type scale (`CmsDisplay`, `CmsBodyText`, `CmsMetaText`, `CmsBlockquote`, `CmsEpigraph`, `CmsHairline`, `CmsNote`, `CmsParagraphNumber`, `CmsSectionNumber`) cover the SG sections.
- Square surfaces and SG line language (`--line-strong`, `--line-grid`, `--line-accent`, `--line-menu-accent`, `--line-reading`, `--line-dashed`) available through utilities and primitives.
- Form state matrix (`default | focus | filled | error | disabled`) codified in `CmsTextInput`, `CmsTextarea`, `CmsSelect`, with `⚑` error contract through `CmsFormField`.
- Focus policy split per SG: border swap on inputs/select trigger, 3px accent outline on buttons/links/accordion/dialog/checkbox/radio/toggle.
- Dark mode explicitly unsupported: no `dark:*` utilities in CMS components, `color-scheme: light` forced.
- Sonner toaster mounted in `app/layout.tsx` — `cmsToast.{info|breaking|error}` renders per SG.
- Components governance in `docs/cms-ui.md`: primitive usage map, wrapper-only rule for shadcn primitives in CMS modules, PR checklist.
- Responsive collapse under 768px and grid tokens in place; CMS shell and list components include mobile fallbacks.
- Quality gates (`pnpm lint`, `pnpm typecheck`, `pnpm build`) enforced in PR workflow; CMS smoke checklist in `docs/cms-smoke-checklist.md`.

## 3) Open

Medium:

- Per-page a11y verification pass (focus order, labels, aria details, contrast checks) not yet executed as a formal checklist run.
- Advanced SG component parity (richer CTA/cover variants beyond the current `CmsEditorialCard`) pending domain screens to exercise them.

Low:

- i18n: keep enforcing no hardcoded user-facing copy during CRUD rollout.
- Performance: keep client boundaries minimal while adding data hooks per resource.
