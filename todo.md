# TODO - Fase API (pre-CMS) - struttura ordinata e scalabile

Contesto: Next.js 16 (App Router), Better Auth, Prisma, DB unico in produzione.

Decisioni gia fissate:

- Hard delete per tutte le entita.
- `ADMIN` puo gestire utenti e assegnare ruoli.
- `EDITOR` puo gestire tutto il resto (dominio editoriale), ma non utenti.

## 10) Documentazione tecnica API

- [ ] Aggiornare `README.md` con struttura cartelle API e convenzioni.
- [ ] Documentare matrice permessi ruoli.
- [ ] Documentare payload request/response reali per frontend CMS.
- [ ] Documentare casi d'errore e codici HTTP per endpoint.
