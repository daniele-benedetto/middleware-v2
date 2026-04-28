# TODO - Fase CMS UI (tRPC-only)

Contesto: Next.js 16 (App Router), Better Auth, Prisma, API tRPC unica, DB unico in produzione.

Decisioni gia fissate:

- API backend tRPC-only (`/api/trpc`), nessun residuo REST.
- Ruoli: `ADMIN` gestisce utenti + dominio editoriale, `EDITOR` gestisce solo dominio editoriale.
- Delete policy: hard delete per tutte le risorse.
- Invariante dominio: `publishedAt` solo con `status = PUBLISHED` (gia lato API).
- Slug normalizzato lato API e univocita rispettata lato DB.
- Create/Edit devono avvenire su rotte dedicate per risorsa (no inline CRUD dentro list screen).

## Parallelo CRUD routes (fatto)

Route `new` e `[id]/edit` create per tutte le risorse, gating `cmsCrudRoutesEnabled` flippato a `true`. Le pagine montano direttamente i `Cms<Resource>FormScreen` esistenti. Route Users include guard ADMIN inline (`requireCmsSession` + `hasCmsRole`); le altre risorse si appoggiano al guard di sessione del layout `(cms)`.

- [x] `/cms/issues/new` e `/cms/issues/[id]/edit`
- [x] `/cms/categories/new` e `/cms/categories/[id]/edit`
- [x] `/cms/tags/new` e `/cms/tags/[id]/edit`
- [x] `/cms/articles/new` e `/cms/articles/[id]/edit`
- [x] `/cms/users/new` e `/cms/users/[id]/edit` (ADMIN-only)
- [x] `cmsCrudRoutesEnabled = true` in `lib/cms/crud-routes.ts`
- [x] `pnpm typecheck` e `pnpm lint` puliti

## 5) Modulo Issues

Procedure API disponibili: `issues.list`, `issues.getById`, `issues.create`, `issues.update`, `issues.delete`, `issues.reorder`.

- [x] Route create/edit dedicata.
- [x] Validazione client basata su `createIssueInputSchema` / `updateIssueInputSchema` via helper condiviso `validateFormInput`.
- [x] Conflitto slug (`CONFLICT`) gestito via `mapCrudDomainError("issues")`.
- [x] Slug auto-generato dal titolo lato server con suffix `-1` / `-2` su collisione (max 100 tentativi); slug opzionale in `createIssueInputSchema`; bottone "Rigenera" in edit.
- [x] Layout edit a due colonne (sinistra form, destra pannello articoli).
- [x] Pannello articoli con drag-and-drop (`@dnd-kit/sortable`); riga: titolo + status badge + featured pin.
- [x] Save unificato: `issues.update` + `articles.reorder` (solo se ordine cambiato).
- [x] Breadcrumbs: provider context + filtro segmento `edit` + override label per UUID; `new` mappato a "Nuovo". Tutti e 5 i form screens cablati con `useSetCmsBreadcrumbLabel`.

## 6) Modulo Categories

Procedure API disponibili: `categories.list`, `categories.getById`, `categories.create`, `categories.update`, `categories.delete`.

- [x] Route create/edit dedicata.
- [x] Validazione client allineata allo schema via `validateFormInput`.
- [x] Conflitto slug (`CONFLICT`) gestito via `mapCrudDomainError("categories")`.

## 7) Modulo Tags

Procedure API disponibili: `tags.list`, `tags.getById`, `tags.create`, `tags.update`, `tags.delete`.

- [x] Route create/edit dedicata.
- [x] Validazione client allineata allo schema via `validateFormInput`.
- [x] Conflitto slug (`CONFLICT`) gestito via `mapCrudDomainError("tags")`.

## 8) Modulo Articles

Procedure API disponibili: `articles.list`, `articles.getById`, `articles.create`, `articles.update`, `articles.delete`, `articles.syncTags`, `articles.publish`, `articles.unpublish`, `articles.archive`, `articles.feature`, `articles.unfeature`, `articles.reorder`.

- [x] Route create/edit dedicata.
- [x] Selector `Issue` / `Categoria` / `Autore` (sostituiti i text-input liberi).
- [x] Endpoint `users.listAuthors` (DTO ridotto id+email+name, policy ADMIN+EDITOR) per il selector autore in articles form.
- [x] Editor `contentRich` strutturato via TipTap (`@tiptap/react` + `@tiptap/starter-kit`) con primitive `CmsRichTextEditor` coerente al design CMS.
- [x] `articleDetailDtoSchema` separato dal summary: `getById` ora ritorna anche `contentRich`, `excerpt`, `imageUrl`, `audioUrl`, `audioChunks`, `tagIds`. Lista invariata.
- [x] In edit precaricati: `selectedTagIds`, `contentRich`, `excerpt`, `imageUrl`, `audioUrl`, `audioChunks` dal detail.
- [x] Sync tags (`articles.syncTags`) chiamato solo se `tagIds` cambiati rispetto allo stato corrente; supporta anche la rimozione totale.
- [x] Prefetch detail server-side per article edit (`prefetchArticleById`) — niente flash di loading.
- [ ] `audioChunks` editor strutturato — al momento textarea JSON con validazione (campo power-user, schema versionato; rinviato).

## 9) Modulo Users (solo ADMIN)

Procedure API disponibili: `users.list`, `users.getById`, `users.create`, `users.update`, `users.updateRole`, `users.delete`.

- [x] Route create/edit dedicata con guard ADMIN.
- [x] In edit: email mostrata come campo disabilitato in cima al form.
- [x] In edit: selector ruolo che chiama `users.updateRole` solo se cambiato rispetto al valore corrente.
- [x] Label "Crea" / "Salva" centralizzata in `i18n.cms.forms` e applicata a tutti i 5 form screens.

## Divergenze rimaste (post-parallelo)

Lavori per-risorsa da affrontare separatamente, in ordine consigliato:

1. **Articles**: sostituzione input ID con selector reali — il form attuale e inutilizzabile in produzione senza questo.
2. **Users edit**: email read-only + ruolo nel form.
3. ~~**Validazione client**: condividere helper basato sugli Zod schemas (`lib/server/modules/*/schema`) per evitare check ad-hoc.~~ Fatto via `features/cms/shared/forms/validate-form.ts`.
4. ~~**Prefetch detail in edit**: aggiungere `prefetch<Resource>ById` in `server-prefetch.ts` ed esporre `initialData` nei hook `use<Resource>ById` per eliminare il flash di `CmsLoadingState`.~~ Fatto per issues/categories/tags/users (articles rimandato per scelta utente).
5. **i18n** copy "Crea" / "Salva" / titoli "Nuovo X" / "Modifica X" — oggi hardcoded nei form screen.

- [ ] Sostituire i fallback OG/Twitter con asset editoriali finali in `public/brand/`:
  - [ ] `og-default-1200x630.png`
  - [ ] `twitter-default-1200x630.png`

errori

## Error Type

Console Error

## Error Message

(node:63185) Warning: SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:

- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=require'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.
(Use `node --trace-warnings ...` to show where the warning was created)

    at CmsLayout (<anonymous>:null:null)

Next.js version: 16.2.4 (Turbopack)
