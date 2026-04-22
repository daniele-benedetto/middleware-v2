# TODO - Fase API (pre-CMS) - struttura ordinata e scalabile

Contesto: Next.js 16 (App Router), Better Auth, Prisma, DB unico in produzione.

Decisioni gia fissate:

- Hard delete per tutte le entita.
- `ADMIN` puo gestire utenti e assegnare ruoli.
- `EDITOR` puo gestire tutto il resto (dominio editoriale), ma non utenti.

## 2) Contratto API e convenzioni

- [ ] Definire sorting/filter contract supportato per ogni risorsa.

## 3) AuthN/AuthZ (ruoli)

- [x] Collegare il ruolo reale utente in sessione Better Auth e applicare enforcement completo delle policy.
- [ ] Definire auditing minimo API: `actorId`, `role`, `action`, `resource`, `resourceId`, `timestamp`.

## 4) Gestione utenti (solo ADMIN)

- [ ] `GET /users` (list)
- [ ] `GET /users/:id` (detail)
- [ ] `POST /users` (create)
- [ ] `PATCH /users/:id` (update profilo)
- [ ] `PATCH /users/:id/role` (assegnazione/promozione ruolo da admin)
- [ ] `DELETE /users/:id` (hard delete)
- [ ] Garantire blocco totale editor su `/users*` con `403` consistente.

## 5) CRUD core CMS (hard delete)

### Issue

- [ ] `POST /issues`
- [ ] `GET /issues`
- [ ] `GET /issues/:id`
- [ ] `PATCH /issues/:id`
- [ ] `DELETE /issues/:id` (hard delete)

### Category

- [ ] `POST /categories`
- [ ] `GET /categories`
- [ ] `GET /categories/:id`
- [ ] `PATCH /categories/:id`
- [ ] `DELETE /categories/:id` (hard delete)

### Tag

- [ ] `POST /tags`
- [ ] `GET /tags`
- [ ] `GET /tags/:id`
- [ ] `PATCH /tags/:id`
- [ ] `DELETE /tags/:id` (hard delete)

### Article

- [ ] `POST /articles` con normalizzazione slug.
- [ ] `GET /articles` con filtri (`status`, `issueId`, `categoryId`, `featured`, `q`) + paginazione.
- [ ] `GET /articles/:id`
- [ ] `PATCH /articles/:id`
- [ ] `DELETE /articles/:id` (hard delete)
- [ ] `PUT /articles/:id/tags` (sync tag atomico)

## 6) Azioni editoriali (oltre CRUD)

- [ ] `POST /articles/:id/publish` (enforce invarianti publish)
- [ ] `POST /articles/:id/unpublish`
- [ ] `POST /articles/:id/archive`
- [ ] `POST /articles/:id/feature`
- [ ] `POST /articles/:id/unfeature`
- [ ] `POST /articles/reorder` (position dentro issue)

## 7) Validazione e integrita applicativa

- [x] Enforce invarianti nel service layer (modulo articoli):
- [x] - `publishedAt` valorizzato solo con `status = PUBLISHED`
- [x] - slug sempre normalizzato prima del write
- [x] - unicita slug per issue con gestione conflict pulita
- [x] Usare transazioni Prisma per update composti (`article + tags + status`) nel modulo articoli.

## 8) Performance, sicurezza, operativita

- [ ] Definire limite massimo `pageSize` e default robusti.
- [ ] Definire rate-limit baseline per endpoint write/sensibili.
- [ ] Verificare query principali rispetto agli indici attuali.
- [ ] Definire idempotenza minima per endpoint critici (publish/reorder se richiesto).
- [ ] Definire policy log errori (no leak di dettagli sensibili verso client).

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
