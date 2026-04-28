# TODO - Fase CMS UI (tRPC-only)

Contesto: Next.js 16 (App Router), Better Auth, Prisma, API tRPC unica, DB unico in produzione.

Decisioni gia fissate:

- API backend tRPC-only (`/api/trpc`), nessun residuo REST.
- Ruoli: `ADMIN` gestisce utenti + dominio editoriale, `EDITOR` gestisce solo dominio editoriale.
- Delete policy: hard delete per tutte le risorse.
- Invariante dominio: `publishedAt` solo con `status = PUBLISHED` (gia lato API).
- Slug normalizzato lato API e univocita rispettata lato DB.
- Create/Edit devono avvenire su rotte dedicate per risorsa (no inline CRUD dentro list screen).

## Divergenze rimaste (post-parallelo)

Lavori per-risorsa da affrontare separatamente, in ordine consigliato:

1. **Articles**: sostituzione input ID con selector reali — il form attuale e inutilizzabile in produzione senza questo.
2. **Users edit**: email read-only + ruolo nel form.
3. ~~**Prefetch detail in edit**: aggiungere `prefetch<Resource>ById` in `server-prefetch.ts` ed esporre `initialData` nei hook `use<Resource>ById` per eliminare il flash di `CmsLoadingState`.~~ Fatto per issues/categories/tags/users (articles rimandato per scelta utente).
4. **i18n** copy "Crea" / "Salva" / titoli "Nuovo X" / "Modifica X" — oggi hardcoded nei form screen.

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
