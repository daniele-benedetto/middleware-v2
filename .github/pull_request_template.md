## Checklist

- [ ] Ho verificato prima i componenti disponibili in `shadcn/ui`.
- [ ] Se ho creato componenti custom, ho spiegato perche la composition `shadcn/ui` non era sufficiente.
- [ ] Ho rispettato i token e le regole del design system in `docs/cms-ui.md`.
- [ ] Ho verificato loading/empty/error/success/a11y/responsive per le pagine toccate.
- [ ] Le route CMS toccate restano orchestration-only (`app/(cms)`), senza logica business.
- [ ] Ho mantenuto la logica di feature in `features/cms/*` e la logica shared in `lib/cms/*`.
- [ ] Se ho toccato guard/autorizzazioni, ho seguito `docs/cms-smoke-checklist.md`.
- [ ] Ho verificato parity stati UI per componenti toccati (`default`, `hover`, `focus`, `disabled`, `loading`).
- [ ] Ho verificato parity varianti editoriali card/CTA dove applicabile.
- [ ] Non ho introdotto nuove classi tipografiche duplicate quando esiste una primitive CMS equivalente.
- [ ] Ho eseguito `pnpm lint`, `pnpm typecheck` e `pnpm build`.
