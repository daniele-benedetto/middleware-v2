# CMS Audit — Report

> Audit del CMS di `middleware-v2` (Next.js 16 + React 19 + tRPC + Prisma + Tailwind v4).
> Stato: **completato** — `pnpm lint` e `pnpm typecheck` verdi, zero `any`, zero TODO/FIXME nel codice di prodotto.
> Convenzioni:
>
> - [x] = verificato
> - ✅ = punto di forza
> - ⚠️ = problema reale (con `file:line`)
> - 💡 = miglioramento proporzionato

---

## 1. Architettura complessiva ✅ FIXED

- [x] Separazione layer `app/` ↔ `features/` ↔ `lib/server/` ↔ `components/`
- [x] Confini server/client (`import "server-only"` rispettato)
- [x] Coerenza con AGENTS.md (DTO/schema/policy/repository/service)
- [x] Stessa anatomia per articles/categories/issues/tags/users/media
- [x] Nessun import circolare
- [x] `shared/*` non è dumping ground

✅ Layering esemplare in `lib/server/modules/<resource>/{repository,service,dto,schema,policy}`.
✅ Feature-folder coerenti (`features/cms/<dominio>/{screens,hooks,components}`).
✅ Confine server/client esplicito.

### Correzioni applicate

- ✅ Rimossa cartella morta `features/cms/dashboard/data/`.
- ✅ `getTrpcCaller` (`lib/server/trpc/caller.ts`) wrappato con `react.cache`: tutti i `prefetch*` nella stessa request riusano lo stesso caller (e quindi lo stesso `TrpcContext` + risoluzione session), eliminando la duplicazione di context/headers/auth roundtrip.
- ✅ `pnpm typecheck` + `pnpm lint --max-warnings=0` verdi.

---

## 2. Routing & App Router (Next 16) ✅ FIXED

- [x] Route group `(auth)` e `(cms)` separati
- [x] Layout annidati corretti
- [x] RSC default; `"use client"` solo dove serve
- [x] `loading`/`error`/`not-found` presenti dove rilevante
- [x] `params` awaited (`Promise` in Next 16)
- [x] `generateMetadata` su pagine SEO
- [x] Route segment config esplicita (`runtime = "nodejs"`, `dynamic = "force-dynamic"` su tRPC)
- [x] Nessuna duplicazione tRPC ↔ REST
- [x] `forbidden()` Next 16 corretto (con `experimental.authInterrupts: true`)

✅ `app/(cms)/cms/layout.tsx` chiama `requireCmsSession("/cms")` lato server.
✅ `app/(cms)/cms/users/page.tsx` usa `forbidden()` correttamente.
✅ `app/api/trpc/[trpc]/route.ts` con `runtime = "nodejs"`, `dynamic = "force-dynamic"`.
✅ `app/(cms)/cms/articles/[id]/edit/page.tsx` awaita `params` e valida UUID.

### Correzioni applicate

- ✅ Nuovo wrapper `components/cms/primitives/rich-text-editor-lazy.tsx` con `next/dynamic({ ssr: false })` + skeleton di altezza coerente; il barrel `components/cms/primitives/index.ts` ora ri-esporta `CmsRichTextEditor` dal lazy wrapper, quindi i 3 form screen che lo consumano (articles, issues, taxonomy) ottengono code-splitting senza modifiche.
- ✅ `CmsMediaLibrary` dinamizzato in `features/cms/media/components/media-picker-dialog.tsx` (apertura on-click). La pagina `/cms/media` continua a importarlo direttamente — è il suo contenuto principale, splittarlo non porterebbe benefici.
- ✅ `ArticleJsonPreview` lasciato inline: nessuna libreria pesante (`fetch` + `JSON.parse`), il guadagno sarebbe marginale e l'estrazione introdurrebbe complessità superflua.
- ✅ `pnpm typecheck`, `pnpm lint --max-warnings=0` e `pnpm build` (Next 16 + Turbopack) verdi.

---

## 3. Layer server (tRPC + Prisma) ✅ FIXED

- [x] Router = orchestrazione (no business logic)
- [x] Repository = solo accesso dati
- [x] Service con regole di dominio + invarianti
- [x] DTO validati con `parseOutput`
- [x] Zod su ogni `.input(...)`
- [x] Policy non hardcoded
- [x] Middlewares centralizzati (`lib/server/trpc/middlewares`)
- [x] Errori via `lib/server/http/api-error.ts`
- [x] Slug normalizzato in service
- [x] Transazioni Prisma su `create+tagIds`, `syncTags`, `replaceMediaUrl`
- [x] Niente N+1 (`select` espliciti)
- [x] Indici DB coerenti (`@@unique([issueId, slug])`, status/publishedAt/featured)
- [x] Hard delete coerente
- [x] `server-only` presente

✅ `mapApiErrorMiddleware` (`lib/server/trpc/init.ts`) traduce `ApiError` → `TRPCError`.
✅ `parseOutput(result, schema)` su tutti i return dei router.
✅ Repository con `select` espliciti ovunque.
✅ `assertPublishedAtConsistency` enforce dell'invariante in `lib/server/modules/articles/service/index.ts`.

### Correzioni applicate

- ✅ `articlesRepository.create()` ora esegue `create` + `articleTag.createMany` + read finale con `ARTICLE_DETAIL_SELECT` nella stessa transaction; `articlesService.create()` non fa piu un `getById()` separato.
- ✅ `articlesRepository.update()` ritorna direttamente il record completo con `ARTICLE_DETAIL_SELECT`; `articlesService.update()` elimina il roundtrip post-update.
- ✅ `reorder` resta in una singola transaction ma sostituisce il loop sequenziale con `Promise.all(...)` sugli update di posizione.
- ✅ `publish/unpublish/archive/feature/unfeature` sono ora idempotenti a livello service: se l'articolo e gia nello stato target, la mutation ritorna il record corrente senza write inutile.

---

## 4. Autenticazione & Autorizzazione ✅ FIXED

- [x] Better Auth coerente con strategia ID dichiarata (UUID `User`, string `Session/Account/Verification`)
- [x] Recupero session/role centralizzato
- [x] `ADMIN` / `EDITOR` rispettati (editor non accede a user-management)
- [x] Protezione route lato server (`requireCmsSession`)
- [x] `app/(auth)/cms/login` non protetta
- [x] Cookie flag corretti (gestiti da Better Auth)

✅ Policy granulari per dominio (`lib/server/modules/*/policy/index.ts`).
✅ `requireRoleMiddleware(allowedRoles)` parametrico in `lib/server/trpc/middlewares/require-role.ts`.
✅ `getCmsSession` (`lib/cms/auth.ts`) wrappato in `react.cache`.

### Correzioni applicate

- ✅ Better Auth ora espone `user.role` direttamente via `user.additionalFields.role` (`lib/auth.ts`), quindi `resolveSession()` non fa piu il `prisma.user.findUnique` separato.
- ✅ `resolveSession` (`lib/server/auth/session.ts`) scende a una sola chiamata `auth.api.getSession({ headers })`, con narrowing runtime su `ADMIN|EDITOR` al boundary auth.
- ✅ Le mutation tRPC con audit non risolvono piu la sessione due volte nella stessa request: `auditMiddleware` passa `ctx.session` ad `auditAction` (`lib/server/trpc/middlewares/audit.ts`, `lib/server/http/audit.ts`).

---

## 5. Componenti UI ✅ FIXED

- [x] `components/ui/*` shadcn intoccato (override in CMS layer)
- [x] `components/cms/primitives/*` non duplicano `components/ui`
- [x] `components/cms/layout/*` riusabile (sidebar, breadcrumbs, shell)
- [x] `components/cms/common/*` con responsabilità chiare
- [x] `features/*/screens` come composizione
- [x] `features/*/components` feature-scoped
- [x] Form controls canonici (`components/cms/primitives/form-controls.tsx`)
- [x] `CmsShellSystemState` riusato per empty/error/forbidden
- [x] Aspect ratio / media unificati
- [x] Loading / skeleton uniformi
- [x] Accessibilità base OK

✅ `CmsTextInput`, `CmsSelect`, `CmsSearchSelect` (con `useDeferredValue`), `CmsToggle` ecc. via `cva`.
✅ `CmsTaxonomyListScreen<T>` (`features/cms/shared/taxonomy/taxonomy-list-screen.tsx`) riusato per categorie e tag.

### Correzioni applicate

- ✅ Rimossi gli export morti `CmsSortIcon` e `CmsSortDirection` da `components/cms/primitives/data-table-shell.tsx` e dal barrel `components/cms/primitives/index.ts`.
- ✅ Estratti i sotto-componenti inline del form articolo in `features/cms/articles/components/article-media-field-preview.tsx` e `features/cms/articles/components/article-tags-multi-select.tsx`.
- ✅ Separata la toolbar del list screen in `features/cms/articles/components/articles-list-toolbar.tsx`, isolando filtri e bulk actions dal body tabellare.

---

## 6. State management & data fetching ✅ FIXED

- [x] tRPC client + React Query configurato (`lib/cms/trpc`, `lib/trpc/provider.tsx`)
- [x] Prefetch server-side dove sensato
- [x] `invalidate` mirate (no global)
- [x] Optimistic updates con rollback
- [x] No `fetch()` manuale dove esiste procedura
- [x] URL come stato per paginazione/filtri
- [x] Form state coerente

✅ `cmsQueryPolicy.list/options` in `features/cms/shared/hooks/use-cms-list-query.ts`.
✅ `useReorderMode`, `useListSelection`, `useCmsListUrlState` riusabili.
✅ `applyOptimisticArticleUpdates` in `articles-list-screen.tsx` ritorna funzione di rollback.
✅ `invalidateAfterCmsMutation` (`lib/cms/trpc/invalidation.ts`) centralizza per dominio.

### Correzioni applicate

- ✅ Rimossi `cmsQueryKeys`, `useCmsMutationErrorMapper` e `useArticlesReorder`, che erano codice morto non consumato.
- ✅ Estratta la policy query condivisa in `lib/cms/trpc/query-policy.ts`; `TrpcProvider` (`lib/trpc/provider.tsx`) ora crea `QueryClient` con `defaultOptions.queries` allineati a `cmsQueryPolicy.list`.
- ✅ `features/cms/shared/hooks/use-cms-list-query.ts` continua a specializzare i list query con `keepPreviousData`, ma senza duplicare i numeri della policy.
- ✅ Aggiunti `react-hook-form` e `@hookform/resolvers`; `features/cms/articles/screens/article-form-screen.tsx` ora usa RHF + `zodResolver`, con `Controller/useWatch` per i controlli custom e stato locale ridotto ai soli concern UI (picker dialog + slug editor mode).
- ✅ La validazione resta coerente ai boundary: resolver Zod lato client per lo state form, `validateFormInput(create/updateArticleInputSchema)` come ultimo gate sui payload verso tRPC.

---

## 7. Performance ✅ FIXED

- [x] RSC come default
- [x] `next/image` su upload/media
- [x] Liste paginate con `keepPreviousData`
- [x] Prisma `select` mirato
- [x] Tailwind v4 con `@theme inline`
- [x] No moment/lodash full-import
- [x] Code-splitting client

✅ `useDeferredValue` in `CmsSearchSelect` e `MediaLibrary`.
✅ Indici Prisma coerenti (`status`, `publishedAt`, `featured`, `(issueId, slug)`).
✅ Direct upload Vercel Blob (no proxy server) in `app/api/cms/media/upload/route.ts`.

### Correzioni applicate

- ✅ `lib/server/http/rate-limit.ts` usa ora Redis via `REDIS_URL` e client singleton `lib/redis.ts`; il fallback in-memory resta solo come degrado controllato se Redis non è configurato o non è raggiungibile.
- ✅ `reorder` non è più sequenziale (vedi §3): una sola transaction con update concorrenti.
- ✅ Bundle CMS alleggerito con `next/dynamic` su rich text editor e media library (vedi §2); `ArticleJsonPreview` resta inline intenzionalmente perché non introduce librerie pesanti.

---

## 8. Type safety ✅ VERIFIED

- [x] `pnpm typecheck` pulito
- [x] Zero `any` nel codice di prodotto (verificato via grep)
- [x] Tipi a confine derivati da Zod (`z.infer`)
- [x] DTO ≠ tipo Prisma
- [x] Path alias `@/*` coerente
- [x] Enum Prisma single source of truth

✅ `parseOutput` valida i DTO a runtime.
✅ Tipi espliciti ai bordi (input procedure, output service, repository contracts).
✅ Ricontrollato sul codice di prodotto corrente: `pnpm typecheck` pulito, nessun `any` nei path applicativi (escluso il client Prisma generato).

💡 Mantieni la disciplina dei DTO. Valuta `z.brand` per `UserId`/`ArticleId` se vorrai prevenire scambi accidentali.

---

## 9. Code reuse & DRY ✅ FIXED

- [x] Helper centralizzati (slug, role label, status label)
- [x] i18n keys come unica fonte
- [x] Mappers non duplicano DTO
- [x] List/detail/edit/new pattern condivisi

✅ `validateFormInput` (`features/cms/shared/forms/validate-form.ts`) + `mapCrudDomainError` (`features/cms/shared/forms/error-mapping.ts`).
✅ `executeBulk(ids, runner)` con `Promise.allSettled` (`features/cms/shared/actions/execute-bulk.ts`).
✅ `resolveCmsRouteEntityIdOrNotFound` + `prefetchCmsDetailOrNotFound` su tutte le pagine `[id]`.
✅ `useCmsFormNavigation(listPath)` per cancel/success.

### Correzioni applicate

- ✅ `lib/cms/trpc/server-prefetch.ts` ora centralizza i cinque wrapper `prefetchXxxList` in un helper generico `prefetchCmsList(input, prefetcher)`, mantenendo invariata l'API usata dalle pagine CMS.

---

## 10. Error handling & UX di errore

- [x] Errori tRPC mappati a UI con i18n
- [x] Forbidden state dedicato
- [x] Form validation field-level + summary
- [x] `error.tsx` per ogni route group
- [x] Logging server presente

✅ `mapTrpcErrorToCmsUiMessage` (`lib/cms/trpc/error-messages.ts`) traduce 7 codici tRPC.
✅ `mapCrudDomainError` con override per `CONFLICT` per dominio (es. `slugConflictTitle`).
✅ `errorFormatter` espone `data.details` per `BAD_REQUEST` Zod (`lib/server/trpc/init.ts`).
✅ `CmsShellSystemState` per stati uniformi.

⚠️ Nessuna telemetria errori (Sentry o equivalente).

### Correzioni applicate

- ✅ `AuditLog` persistente in Prisma (`prisma/schema.prisma`) con actor, outcome, path, requestId, IP, user-agent ed eventuale errore.
- ✅ Aggiunta migration Prisma non applicata `prisma/migrations/20260506120000_add_audit_logs/migration.sql` per creare enum e tabella `audit_logs` in modo esplicito.
- ✅ `lib/server/trpc/middlewares/audit.ts` registra ora l'esito reale della mutation (`SUCCESS`/`FAILURE`) invece del solo tentativo iniziale.
- ✅ `lib/server/http/audit.ts` salva su DB e degrada a `console.info` solo come fallback se la persistenza non e disponibile.
- ✅ Nuova vista admin-only `/cms/audit-logs` con filtri e paginazione per consultare i log persistiti senza uscire dal CMS.

💡 Wire-up minimale Sentry server-side per `INTERNAL_SERVER_ERROR`/non mappati.

---

## 11. i18n & contenuti ✅ FIXED

- [x] Una sola lingua attiva (it) con coerenza naming
- [x] Date/numero formatter centralizzati
- [x] Pluralizzazione uniforme

✅ Centralizzato in `lib/i18n/it/cms.ts`, accesso via `i18n.cms.*` (zero magic string nei componenti).
✅ Schema validation messages mappati a chiavi i18n (`features/cms/shared/forms/validate-form.ts`).

### Correzioni applicate

- ✅ Rimosse da `lib/i18n/it/cms.ts` le chiavi dashboard non più referenziate dopo la semplificazione a quick-links: `dashboard.metrics.*`, `dashboard.activity.*`, `dashboard.statusTitle`, `dashboard.statusSubtitle`, `dashboard.activityTitle`, `dashboard.activitySubtitle`.

---

## 12. Validazione ✅ VERIFIED

- [x] Zod su input/output procedure + form schema
- [x] Schema riusati tra client e server dove sensato
- [x] Trim/normalize prima della persistenza
- [x] Limiti dimensione su upload (25MB) e lunghezze title/slug

✅ Slug normalizzato in service prima della scrittura (`lib/server/modules/articles/service/index.ts`).
✅ `assertPublishedAtConsistency` enforce dell'invariante `publishedAt` ↔ `PUBLISHED`.
✅ Validazione UUID delle param `[id]` su tutte le route `cms/.../[id]`.
✅ Upload media: pathname sanificato, kind whitelisted, max 25MB, no overwrite, no random suffix (`app/api/cms/media/upload/route.ts`).

✅ Ricontrollata sul codice corrente: nessun gap rilevante emerso tra schema Zod, validazione route params, normalizzazione slug e vincoli upload.

💡 Mantieni `assertPublishedAtConsistency` come unico punto di verità; estendi se aggiungerai workflow editoriali.

---

## 13. Convenzioni & coerenza ✅ FIXED

- [x] Naming file `kebab-case.tsx` coerente
- [x] Naming componenti `PascalCase`, prefisso `Cms*` dove utile
- [x] Barrel files solo dove servono
- [x] Commenti minimali, nessun rumore
- [x] Zero TODO/FIXME nel codice di prodotto (grep verificato)
- [x] Nessun `console.log` casuale

✅ Naming coerente (`Cms*`, `useCms*`, `*Screen`, `*Service`, `*Repository`).
✅ `import "server-only"` presente nei moduli sensibili.
✅ Tailwind v4 via `@theme inline` in `app/globals.css` (no `tailwind.config.*`).

### Correzioni applicate

- ✅ I sotto-componenti articolo prima inline sono ora estratti in `features/cms/articles/components/*` e ricondotti alle primitives/shared UI del CMS (`CmsActionButton`, `CmsMetaText`, `CmsBody`, ecc.), eliminando l'incoerenza estetica segnalata.
- ✅ Ricontrollati `TODO/FIXME` e naming sul codice di prodotto corrente: nessun rilievo nuovo emerso.

---

## 14. Build, tooling, DX

- [x] `pnpm lint --max-warnings=0` pulito
- [x] `pnpm typecheck` pulito
- [x] `pnpm build` pulito
- [x] ESLint flat config moderna (ESLint 9)
- [x] Prettier uniforme
- [x] Husky + lint-staged attivi
- [x] CI GitHub Actions presente (`.github/workflows/ci.yml`, `pnpm check:all` su Node 24 / pnpm 10)

✅ `pnpm check:all` (lint + typecheck + prisma:validate + build) in CI.
✅ `tsconfig.json` strict, alias `@/*` consistente.

⚠️ Nessun framework di test configurato (lo dichiara già `AGENTS.md`).

💡 A medio termine: baseline Vitest sui service layer (integration con Postgres real via testcontainers). Non urgente.

---

## 15. Sicurezza

- [x] Rate limiting su mutation sensibili (best-effort, vedi sotto)
- [x] Audit log su azioni admin
- [x] Upload MIME/size whitelist + sanificazione filename
- [x] Path traversal: id/slug validati prima delle query
- [x] Auth+policy su ogni mutation
- [x] Segreti solo in `.env`

✅ Auth gating server-side (`requireCmsSession`) + role middleware tRPC.
✅ Hash password via `better-auth/crypto`.
✅ Direct upload con `onBeforeGenerateToken`: session + role + sanitize + whitelist + max size + no overwrite.
✅ Blob privati streammati con `cache-control: private, no-store` (`app/api/cms/media/blob/route.ts`).
✅ `buildCmsMetadata` forza `index: false` sulle pagine CMS (`lib/seo/metadata.ts:172-177`).

⚠️ Rate limiter non robusto in serverless (vedi §7).
⚠️ Verificare esplicitamente che `app/api/cms/media/blob/route.ts` faccia session+role check **prima** di proxare blob privati.

💡 Verifica esplicita auth nella route blob. Sposta il rate limit su backing store persistente quando passerai a multi-istanza.

---

## 16. Documentazione

- [x] `AGENTS.md` chiaro: comandi, quirks, regole
- [x] `components/ui/README.md` documenta la regola shadcn first
- [x] Schema Prisma commentato dove non ovvio
- [ ] ADR / changelog architetturale — assente
- [ ] `docs/` di alto livello — assente

✅ AGENTS.md preciso e aggiornato.
✅ Nessun commento rumoroso nel codice.

⚠️ Nessun ADR; le decisioni "single env, hard delete, slug per issue" stanno solo in `AGENTS.md`.
⚠️ Niente diagramma di alto livello.

💡 Una `docs/architecture.md`: flusso request → tRPC → service → repo → DB; flusso upload media; matrice ruoli/risorse. Una pagina, non un trattato.

---

## TL;DR — top 1 azione proporzionata (in ordine di ROI)

1. **`docs/architecture.md`** con flusso request → tRPC → service → repo → DB, upload media e matrice ruoli/risorse.

Niente di tutto ciò richiede over-engineering: interventi locali, ognuno < ~1 ora, con benefici misurabili (latenza, bundle, manutenibilità). La base è in salute — questi sono rifiniture, non rifondazioni.
