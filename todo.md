# TODO - CMS v1 Quality Pass

Contesto: Next.js 16 (App Router), Better Auth, Prisma, API tRPC unica, DB unico in produzione.

Obiettivo adesso:

- portare tutte le risorse del CMS allo stesso livello raggiunto su `issues`
- rianalizzare ogni flusso end-to-end con priorita a qualita del codice, semplicita e completezza v1
- eliminare codice morto, giri inutili, UI grezze e mismatch tra model, API e schermate CMS

Decisioni gia fissate:

- API backend tRPC-only (`/api/trpc`), nessun residuo REST
- ruoli: `ADMIN` gestisce utenti + dominio editoriale, `EDITOR` gestisce solo dominio editoriale
- delete policy: hard delete per tutte le risorse
- slug normalizzato lato API e univocita rispettata lato DB
- create/edit su rotte dedicate per risorsa, no inline CRUD dentro le list screen

## Assets editoriali

- [ ] Sostituire i fallback OG/Twitter con asset editoriali finali in `public/brand/`
- [ ] `og-default-1200x630.png`
- [ ] `twitter-default-1200x630.png`

## Ops / Ambiente

- [ ] Verificare e sistemare il warning PostgreSQL SSL mode visto in runtime
- [ ] Decidere se fissare esplicitamente `sslmode=verify-full` o configurazione equivalente nella connection string
