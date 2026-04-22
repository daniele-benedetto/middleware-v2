# TODO - Fase API (pre-CMS) - struttura ordinata e scalabile

Contesto: Next.js 16 (App Router), Better Auth, Prisma, DB unico in produzione.

Decisioni gia fissate:

- Hard delete per tutte le entita.
- `ADMIN` puo gestire utenti e assegnare ruoli.
- `EDITOR` puo gestire tutto il resto (dominio editoriale), ma non utenti.

## 2) Contratto API e convenzioni

- [x] Definire sorting/filter contract supportato per ogni risorsa.

## 8) Performance, sicurezza, operativita

- [x] Definire limite massimo `pageSize` e default robusti.
- [x] Definire rate-limit baseline per endpoint write/sensibili.
- [x] Verificare query principali rispetto agli indici attuali.
- [x] Definire idempotenza minima per endpoint critici (publish/reorder se richiesto).
- [x] Definire policy log errori (no leak di dettagli sensibili verso client).

## 9) Testing API

- [ ] Introdurre test integration API (auth, CRUD, publish flow, slug conflict).
- [ ] Test autorizzazioni: admin allowed / editor forbidden su users.
- [ ] Test invarianti dominio (`publishedAt/status`, slug).
- [ ] Smoke test manuale con collezione HTTP (Bruno/Postman/Insomnia).

## 10) Documentazione tecnica API

- [ ] Aggiornare `README.md` con struttura cartelle API e convenzioni.
- [ ] Documentare matrice permessi ruoli.
- [ ] Documentare payload request/response reali per frontend CMS.
- [ ] Documentare casi d'errore e codici HTTP per endpoint.

## Definition of Ready - Inizio sviluppo CMS UI

- [ ] Struttura cartelle API applicata e consistente (single responsibility reale).
- [ ] CRUD completo per `Issue`, `Category`, `Tag`, `Article`.
- [ ] Endpoint utenti disponibili e accessibili solo ad `ADMIN` (incluso `PATCH /users/:id/role`).
- [ ] Hard delete implementato e testato su tutte le risorse.
- [ ] Azioni editoriali (`publish/archive/feature/reorder`) operative.
- [ ] Error model + validazione + autorizzazioni coerenti e documentate.
