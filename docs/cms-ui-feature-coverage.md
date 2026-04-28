# CMS UI Feature Coverage

Stato aggiornato dopo introduzione del pattern condiviso di reorder mode e quick delete single/bulk.

## Copertura per modulo

| Modulo        | Lista + filtri/sort/paging | Create | Edit | Delete | Quick actions single/bulk                               | Reorder mode   |
| ------------- | -------------------------- | ------ | ---- | ------ | ------------------------------------------------------- | -------------- |
| Issues        | SI                         | SI     | SI   | SI     | SI (delete single/bulk)                                 | SI             |
| Categories    | SI                         | SI     | SI   | SI     | SI (delete single/bulk)                                 | NO             |
| Tags          | SI                         | SI     | SI   | SI     | SI (delete single/bulk)                                 | NO             |
| Articles      | SI                         | SI     | SI   | SI     | SI (publish/unpublish/archive/feature/unfeature/delete) | SI (per issue) |
| Users (ADMIN) | SI                         | SI     | SI   | SI     | SI (update role + delete, single/bulk)                  | NO             |

## Note importanti

- Tutti i moduli principali espongono ormai create/edit dedicati su route proprie.
- `Articles` supporta anche la selezione tag in create/edit; in create i tag vengono persistiti direttamente, in edit il sync resta una mutation dedicata.
- Il pattern reorder e uniforme dove supportato da API (`issues.reorder`, `articles.reorder`): entry in modalita dedicata, frecce riga, salva/annulla, invalidation centralizzata post-mutation.
- `Categories`, `Tags` e `Users` non espongono endpoint reorder nel backend, quindi la funzionalita non e applicabile senza estendere API.
