# CMS Lists Smoke Checklist

Checklist manuale per validare tutte le pagine lista CMS prima del rilascio.

## Scope

- Pagine: `Issues`, `Categories`, `Tags`, `Articles`, `Users`.
- Focus: stabilita UI, UX error handling, permessi ruolo, flussi critici lista, responsive.
- Escluso: create/edit/detail form (coperti da checklist separate).

## Prerequisiti

- Build locale funzionante (`pnpm dev`).
- Due account di test:
  - `ADMIN`
  - `EDITOR`
- Dataset minimo:
  - almeno 8 record per modulo
  - almeno 1 stato/flag per ogni filtro rilevante
  - almeno 1 scenario vuoto (filtro che ritorna 0 risultati)

## Matrice Risultati

Compilare ogni riga con `PASS` o `FAIL` e note.

| Area                         | Modulo                                | Esito | Note/Bug |
| ---------------------------- | ------------------------------------- | ----- | -------- |
| Caricamento + skeleton       | Issues/Categories/Tags/Articles/Users |       |          |
| Empty state + CTA            | Issues/Categories/Tags/Articles/Users |       |          |
| Error state + retry          | Issues/Categories/Tags/Articles/Users |       |          |
| Debounce ricerca `q`         | Issues/Categories/Tags/Articles/Users |       |          |
| Filtri + sort + paginazione  | Issues/Categories/Tags/Articles/Users |       |          |
| Persistenza URL query params | Issues/Categories/Tags/Articles/Users |       |          |
| Select row + select-all page | Issues/Categories/Tags/Articles/Users |       |          |
| Bulk action bar + contatore  | Issues/Categories/Tags/Articles/Users |       |          |
| Conferma azioni distruttive  | Issues/Categories/Tags/Articles/Users |       |          |

## Checklist Base per Ogni Lista

Ripetere su ogni modulo:

1. Aprire pagina lista da navigazione CMS.
2. Verificare skeleton in loading e rendering tabella finale.
3. Applicare ricerca `q`: controllare debounce e aggiornamento URL.
4. Cambiare filtri/sort: verificare reset selezione e aggiornamento URL.
5. Cambiare pagina e pageSize: verificare consistenza risultati.
6. Usare select row + select-all pagina.
7. Eseguire quick action single e bulk disponibili con dialog conferma.
8. Verificare toast successo/errore e invalidazione dati in tabella.

## Permessi Ruolo (E2E UI)

### ADMIN

- Vede tutte le liste CMS.
- In `Users` puo eseguire `Set ADMIN`, `Set EDITOR`, `Delete` (single + bulk).

### EDITOR

- Non puo accedere alla sezione `Users`.
- Le altre liste sono accessibili solo con azioni consentite da policy.
- Forzando URL protetti deve ricevere UX coerente (`forbidden`/errore permessi).

## Flussi Critici Articles (lista)

Validare sia in single sia in bulk:

- `publish`
- `unpublish`
- `feature`
- `unfeature`
- `archive`
- `delete`

Verifiche obbligatorie:

- Optimistic update visibile su `publish/unpublish/feature/unfeature`.
- Rollback corretto in caso errore.
- Reorder mode:
  - ingresso/uscita modalita
  - move up/down
  - save/cancel
  - ricarica coerente dopo salvataggio

## Error Handling Reale da API

Verificare almeno questi codici con UX esplicita:

- `CONFLICT`
- `BAD_REQUEST`
- `TOO_MANY_REQUESTS`

Per ciascun errore controllare:

- titolo toast coerente al codice
- messaggio azionabile lato editor
- nessun stato UI inconsistente dopo errore

## Responsive Minimo

Eseguire test su:

- desktop (>= 1280px)
- tablet (~768px)
- mobile (~390px)

Controllare:

- toolbar filtri non rotta
- tabella/scorrimento utilizzabile
- bulk action bar leggibile
- dialog conferma usabile
- controlli reorder accessibili

## Exit Criteria

Pronto se:

- nessun bug bloccante/critico aperto sulle liste
- tutte le righe obbligatorie in matrice con `PASS`
- eventuali bug minori tracciati con workaround e priorita
