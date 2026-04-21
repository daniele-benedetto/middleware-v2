# Sprint DB Foundation (Postgres + Prisma + Better Auth)

Obiettivo: impostare una base dati pulita, con naming coerente, schema semplice ma scalabile, pronta per il backend applicativo.

## Principi dello sprint
- Nomi espliciti e consistenti (modelli, colonne, enum, relazioni).
- Struttura minimale: aggiungere solo ciò che serve davvero oggi, lasciando estensioni chiare.
- Vincoli e indici pensati sulle query reali (listing, publish, auth, taxonomy).
- Migrazioni ripetibili e sicure (`migrate dev` in locale, SQL tracciato).

## Scope (in)
- Setup Postgres locale/dev + `DATABASE_URL`.
- Setup Prisma (`schema.prisma`, client generation, prima migration).
- Setup Better Auth models (`User`, `Session`, `Account`, `Verification`) compatibili e stabili.
- Dominio CMS base: `Issue`, `Category`, `Tag`, `Article`, `ArticleTag`.
- Enum editoriali e ruoli utente.
- Indici/unique principali e policy `onDelete` coerenti.

## Out of scope (ora)
- API/backend handlers completi.
- UI admin completa.
- Ricerca full-text avanzata.
- CDN/media processing pipeline.

## TODO

### 1) Infrastruttura DB e env
- [ ] Definire `DATABASE_URL` per ambiente locale.
- [ ] Avviare Postgres in locale (container o servizio) con credenziali documentate.
- [ ] Verificare connessione DB con Prisma (`pnpm exec prisma validate`).

### 2) Prisma base
- [ ] Configurare `datasource db` con `provider = "postgresql"` e `url = env("DATABASE_URL")`.
- [ ] Confermare `generator client` e path output condiviso dal progetto.
- [ ] Aggiungere script npm/pnpm utili (`prisma:generate`, `prisma:migrate`, `prisma:studio`, `prisma:format`).

### 3) Better Auth data layer
- [ ] Validare naming e campi dei modelli auth rispetto all’adapter Better Auth usato.
- [ ] Definire gestione `id` (UUID default vs valore assegnato dall’adapter) e applicarla in modo coerente.
- [ ] Verificare vincoli chiave: `email` unique, token/session unique, provider/account unique.
- [ ] Verificare cascading corretto: delete user => delete session/account.

### 4) Dominio CMS
- [ ] Validare enum `UserRole` e `ArticleStatus` per workflow editoriale.
- [ ] Confermare relazione `Article -> Issue/Category/Author` con `onDelete: Restrict`.
- [ ] Confermare unique slug (`Issue.slug`, `Category.slug`, `Tag.slug`, `Article(issueId, slug)`).
- [ ] Confermare pivot `ArticleTag` con PK composta e indice su `tagId`.
- [ ] Validare campi media/contenuto (`contentRich`, `audioChunks`) e nullable policy.

### 5) Migrazioni e qualità
- [ ] Eseguire `pnpm exec prisma format`.
- [ ] Creare prima migration (`pnpm exec prisma migrate dev --name init_db`).
- [ ] Generare client (`pnpm exec prisma generate`).
- [ ] Verificare drift/schema (`pnpm exec prisma migrate status`).
- [ ] Eseguire check repository: `pnpm lint` + `pnpm exec tsc --noEmit`.

### 6) Documentazione tecnica minima
- [ ] Aggiornare `README.md` con setup DB locale e comandi Prisma.
- [ ] Documentare convenzioni naming (singolare/plurale, snake/camel, mapping `@@map`).
- [ ] Aggiungere nota su come introdurre nuove tabelle senza rompere compatibilità.

## Definition of Done (DoD)
- [ ] Schema Prisma valido e formattato.
- [ ] Migration iniziale applicata con successo su Postgres locale.
- [ ] Prisma Client generato e importabile dal progetto.
- [ ] Better Auth pronto lato data layer (modelli + vincoli verificati).
- [ ] README aggiornato con setup e comandi minimi.
- [ ] Lint e typecheck verdi.

## Decision log (da compilare durante lo sprint)
- [ ] ID strategy auth models:
- [ ] Stati editoriali finali:
- [ ] Regola slug finale (globale vs per issue):
- [ ] Strategia per future migration breaking:
