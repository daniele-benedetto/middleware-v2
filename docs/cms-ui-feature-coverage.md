# CMS UI Feature Coverage

Stato aggiornato dopo introduzione del pattern condiviso di reorder mode e quick delete single/bulk.

## Copertura per modulo

| Modulo        | Lista + filtri/sort/paging | Create | Edit | Delete | Quick actions single/bulk                               | Reorder mode   |
| ------------- | -------------------------- | ------ | ---- | ------ | ------------------------------------------------------- | -------------- |
| Issues        | SI                         | NO     | NO   | SI     | SI (delete single/bulk)                                 | SI             |
| Categories    | SI                         | NO     | NO   | SI     | SI (delete single/bulk)                                 | NO             |
| Tags          | SI                         | NO     | NO   | SI     | SI (delete single/bulk)                                 | NO             |
| Articles      | SI                         | NO     | NO   | SI     | SI (publish/unpublish/archive/feature/unfeature/delete) | SI (per issue) |
| Users (ADMIN) | SI                         | NO     | NO   | SI     | SI (update role + delete, single/bulk)                  | NO             |

## Note importanti

- Non tutti i tipi di contenuti hanno tutte le funzionalita: create/edit mancano ancora su tutti i moduli.
- Il pattern reorder e uniforme dove supportato da API (`issues.reorder`, `articles.reorder`): entry in modalita dedicata, frecce riga, salva/annulla, invalidation centralizzata post-mutation.
- `Categories`, `Tags` e `Users` non espongono endpoint reorder nel backend, quindi la funzionalita non e applicabile senza estendere API.
