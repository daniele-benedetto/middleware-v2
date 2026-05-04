# CMS Audit — TODO

> Checklist di analisi per il CMS di `middleware-v2` (Next.js 16 + React 19 + tRPC + Prisma + Tailwind v4).
> Obiettivo: valutare struttura, qualità, riuso, performance senza sovra-ingegnerizzare.
> Convenzioni:
>
> - [ ] = da verificare
> - [x] = verificato
> - ⚠️ = problema potenziale
> - ✅ = buona pratica confermata
> - 💡 = suggerimento di miglioramento

---

## 1. Architettura complessiva

- [ ] **Separazione dei layer** — `app/` (routing) ↔ `features/` (UI/business UI) ↔ `lib/server/` (dominio) ↔ `components/` (presentational)
- [ ] **Confini tra layer** — il client non importa moduli `lib/server/*` né viceversa (`server-only` rispettato)
- [ ] **Coerenza con AGENTS.md** — la struttura reale rispetta le regole dichiarate (DTO/schema/policy/repository/service)
- [ ] **Modulo per risorsa** — articles/categories/issues/tags/users/media seguono la stessa anatomia
- [ ] **Punti di accoppiamento** — nessun import circolare, nessuna shortcut tra feature non correlate
- [ ] **Cardinalità dei moduli** — i moduli `shared` non sono diventati discariche (`shared/components`, `shared/forms`, `shared/hooks`)

## 2. Routing & App Router (Next 16)

- [ ] **Route groups** — `(auth)` e `(cms)` separano correttamente layouts e middleware
- [ ] **Layouts annidati** — uso corretto di `layout.tsx` per mount path stabili
- [ ] **Server vs Client Components** — default RSC, `"use client"` solo dove serve davvero
- [ ] **`loading.tsx` / `error.tsx` / `not-found.tsx`** — presenza per ogni segment significativo
- [ ] **Dynamic params** — `[id]` tipizzati correttamente; `params` è `Promise` in Next 16 (await)
- [ ] **`generateMetadata`** — usata per pagine SEO-rilevanti
- [ ] **Route segment config** — `runtime`, `dynamic`, `revalidate` espliciti dove necessario
- [ ] **API routes** — solo `app/api/trpc/[trpc]` + `app/api/cms/media/*` + `app/api/auth/[...all]`; nessuna duplicazione tRPC↔REST
- [ ] **Parallel/Intercepting routes** — uso opportuno o assenza giustificata
- [ ] **Caching di Next 16** — chiarezza tra `fetch` cache, `unstable_cache`, `revalidateTag`

## 3. Layer server (tRPC + Prisma)

- [ ] **Procedura tRPC = orchestrazione** — niente business logic nei router (regola AGENTS.md)
- [ ] **Repository** — solo accesso dati Prisma, niente regole di dominio
- [ ] **Service** — regole di dominio, transazioni, invarianti (es. `publishedAt` ↔ `PUBLISHED`)
- [ ] **DTO** — output validato con `parseOutput` prima di tornare al client
- [ ] **Schema (Zod)** — input parsing su ogni `.input(...)`
- [ ] **Policy** — autorizzazione driven by policy, non hardcoded `if role === ADMIN`
- [ ] **Middlewares tRPC** — auth/role/rate-limit/audit centralizzati in `lib/server/trpc/middlewares`
- [ ] **Errori HTTP** — uso di `lib/server/http/*` (no `throw new Error` random)
- [ ] **Normalizzazione slug** — applicata uniformemente nel service, non nel router
- [ ] **Transazioni Prisma** — usate dove serve atomicità (es. articolo + relazioni)
- [ ] **N+1 queries** — `include`/`select` corretti, niente loop di query
- [ ] **Indici DB** — chiavi composite (`@@unique([issueId, slug])`) coerenti con query reali
- [ ] **Soft vs hard delete** — coerenza con la policy «hard delete» dichiarata in AGENTS.md
- [ ] **`server-only`** — presente nei moduli sensibili (auth, repository)

## 4. Autenticazione & Autorizzazione

- [ ] **Better Auth** — configurazione coerente con strategia ID dichiarata (UUID per `User`, string per `Session/Account`)
- [ ] **Sessioni** — recupero session/role centralizzato, no duplicazione
- [ ] **Ruoli** — `ADMIN` / `EDITOR` rispettati: editor non accede ad endpoint user-management
- [ ] **Protezione route** — middleware o layout server-side per `(cms)` (no client-side guard come unica difesa)
- [ ] **Login page** — `app/(auth)/cms/login` separata e non protetta
- [ ] **CSRF / cookie flags** — `httpOnly`, `sameSite`, `secure` corretti

## 5. Componenti UI

- [ ] **`components/ui/*`** — primitive shadcn intoccate dove possibile, override in CMS layer
- [ ] **`components/cms/primitives/*`** — DRY, non duplicano `components/ui`
- [ ] **`components/cms/layout/*`** — shell del CMS riusabile su tutte le pagine
- [ ] **`components/cms/common/*`** — non è un dumping ground; ogni file ha responsabilità chiara
- [ ] **`features/*/screens`** — composizione, no business logic
- [ ] **`features/*/components`** — feature-scoped, non importati da altre feature
- [ ] **Form controls** — un solo set canonico (`components/cms/primitives/form-controls.tsx`)
- [ ] **Empty/Error/Forbidden state** — `CmsShellSystemState` riusato ovunque (commit 3cfc0ab)
- [ ] **Aspect ratio / media** — convenzioni unificate (commit cabc61b)
- [ ] **Loading / skeleton** — pattern unico (commit bfec64b)
- [ ] **Accessibilità base** — label/aria, focus visibile, keyboard nav nelle liste/tabelle

## 6. State management & data fetching

- [ ] **tRPC client** — `lib/cms/trpc` configurato con React Query
- [ ] **SSR vs CSR** — fetch lato server quando possibile (RSC + `prefetch`); CSR solo per interattività
- [ ] **Cache invalidation** — `invalidate` mirate, non `invalidate()` global
- [ ] **Optimistic updates** — usati o esplicitamente esclusi
- [ ] **`useQuery` / `useMutation`** — niente fetch manuale via `fetch()` quando esiste procedura
- [ ] **Form state** — react-hook-form (o equivalente) coerente, non mix di `useState` + RHF
- [ ] **URL come stato** — paginazione/filtri in querystring (shareable, back-button friendly)

## 7. Performance

- [ ] **RSC come default** — minimizzare bundle client
- [ ] **Code-splitting** — `next/dynamic` per editor, modali pesanti, drag&drop
- [ ] **`next/image`** — usato per upload/media, sizes/priority corretti
- [ ] **Streaming / Suspense** — boundary attorno alle parti lente delle dashboard
- [ ] **Liste lunghe** — paginazione cursor-based o virtualizzazione
- [ ] **Bundle size** — niente moment/lodash full-import; usare moduli granulari
- [ ] **`useMemo` / `useCallback`** — solo dove giustificato, non spammati
- [ ] **`React.memo`** — usato su componenti riga di tabella ricalcolati spesso
- [ ] **Prisma `select`** — restituire solo i campi che l'UI consuma
- [ ] **Tailwind v4** — nessun CSS globale superfluo, `@theme inline` ben organizzato

## 8. Type safety

- [ ] **`tsc --noEmit`** — passa pulito
- [ ] **`any` / `unknown`** — assenti o circoscritti a boundary esterni
- [ ] **Tipi a confine** — input/output procedure derivati da Zod (`z.infer`)
- [ ] **DTO ≠ tipo Prisma** — il client non usa direttamente i model Prisma
- [ ] **Path alias `@/*`** — usato consistentemente, no `../../../`
- [ ] **Enum Prisma vs union TS** — un'unica fonte di verità

## 9. Code reuse & DRY

- [ ] **Helper duplicati** — slug, date format, role label, status label centralizzati
- [ ] **Form pattern** — un solo `useCmsForm` o pattern equivalente
- [ ] **Schermate list/detail/edit/new** — generabili da template comune dove possibile
- [ ] **Mappers** — `features/cms/*/mappers` non duplicano i DTO
- [ ] **i18n keys** — `lib/i18n/it/cms.ts` come unica fonte; niente stringhe hardcoded sparse
- [ ] **Resource list page** — `features/cms/resources` astrazione sana o leaky?

## 10. Error handling & UX di errore

- [ ] **Errori tRPC** — mappati a toast/inline error con messaggi i18n
- [ ] **Forbidden state** — UI dedicata (no redirect cieco)
- [ ] **Form validation** — errori field-level + summary
- [ ] **Boundary** — `error.tsx` per ogni route group
- [ ] **Logging server** — errori reali loggati (no `console.log` casuali)

## 11. i18n & contenuti

- [ ] **Una sola lingua attiva (it)** — coerenza nel naming
- [ ] **Pluralizzazione** — pattern uniforme
- [ ] **Date/numero** — formatter centralizzati con locale `it`

## 12. Validazione

- [ ] **Zod ovunque** — input procedure, form schema, parser DTO
- [ ] **Riuso schema** — schema condivisi tra form client e procedure server
- [ ] **Trim/normalize** — applicato prima della persistenza
- [ ] **Limiti dimensione** — upload media, lunghezza title/slug

## 13. Convenzioni & coerenza

- [ ] **Naming file** — `kebab-case.tsx` coerente
- [ ] **Naming componenti** — `PascalCase`, prefisso `Cms*` solo dove utile
- [ ] **Barrel files** — `index.ts` solo dove servono davvero (no re-export catena)
- [ ] **Commenti** — solo dove non-ovvi, no rumore
- [ ] **TODO/FIXME** — pochi e tracciabili
- [ ] **Console.log** — assenti in codice non-script

## 14. Build, tooling, DX

- [ ] **`pnpm lint`** — pulito
- [ ] **`pnpm typecheck`** — pulito
- [ ] **`pnpm build`** — pulito, niente warning rumorosi
- [ ] **ESLint config** — regole sensate, non disabilitate massivamente
- [ ] **Prettier** — formattazione uniforme
- [ ] **Husky / pre-commit** — hook attivi e utili
- [ ] **CI** — workflow GitHub presenti e coerenti

## 15. Sicurezza

- [ ] **Rate limiting** — su mutation sensibili (login, upload, write)
- [ ] **Audit log** — almeno per azioni admin (create user, change role, hard delete)
- [ ] **Upload media** — MIME/size whitelist, sanificazione filename
- [ ] **Path traversal** — id/slug sanificati prima delle query
- [ ] **Auth ai PUT/DELETE** — coperti da policy in ogni router
- [ ] **Segreti** — solo in `.env`, nessun fallback hardcoded

## 16. Documentazione

- [ ] **README** — installazione e onboarding minimi
- [ ] **AGENTS.md / CLAUDE.md** — allineati con la realtà
- [ ] **`docs/`** — coerente, non orfano
- [ ] **JSDoc su funzioni non ovvie** — preferito su API pubbliche

---

## Output finale atteso

Per ogni macro-categoria un giudizio sintetico:

1. Punti di forza ✅
2. Problemi reali ⚠️ con file:line
3. Miglioramenti suggeriti 💡 (proporzionati, no over-engineering)
