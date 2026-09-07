# Piano: Questionari

## Decisioni confermate

- V1: step lineari; un invio per browser tramite token anonimo in cookie; resume stesso browser via IndexedDB.
- Stati: `DRAFT`, `PUBLISHED`, `CLOSED`, `ARCHIVED`. Risultati pubblici solo a questionario `CLOSED` e solo aggregati autorizzati.
- Dopo `firstResponseAt` sono modificabili solo titolo, slug, descrizione e `definition.copy`; definition strutturale bloccata lato service e UI.
- Tutti i testi pubblici vivono in `definition.copy`; tutti i testi CMS vivono in i18n.
- Risposte individuali sono visibili soltanto nel CMS autorizzato; delete questionario e hard delete cascade con audit senza answers.

## Stato attuale

- Modello Prisma, contratto Zod, repository/service, API pubblica con token e rate limit, router CMS e lista CMS sono implementati.
- La lista CMS include RSC prefetch, URL state, ricerca, filtri, paginazione, selezione bulk e delete. Lint e typecheck passano.
- Il builder CMS create/edit è implementato: titolo decorato, slug rigenerabile, descrizione rich, copy pubblico, step e domande riordinabili con drag-and-drop e fallback da tastiera, configurazioni per tipo e lock post-prima-risposta.
- `Questionnaire.titleStyled` è persistito con migrazione additiva. Non sono ancora implementati export CSV, pagina pubblica, IndexedDB/resume, blocco home e dashboard.
- Le risposte CMS sono implementate: route RSC, lista paginata, dettaglio in dialog e interpretazione dei valori dal `definitionSnapshot`. Il dettaglio tRPC richiede anche `questionnaireId`, impedendo l'accesso a una risposta da un altro percorso questionario.
- L'export CSV è implementato via tRPC protetto e auditato, con colonne derivate dagli snapshot, quoting CSV e protezione da formule spreadsheet.

## Prossima attivita: Renderer pubblico

### Obiettivo

Pubblicare il questionario in un percorso pubblico accessibile solo nello stato `PUBLISHED`, con renderer derivato da `definition`, invio tramite API pubblica, gestione token anonimo e stati di completamento o chiusura.

### Step

1. Esaminare il contratto del modulo pubblico e definire la route canonica dal relativo slug.
2. Creare page RSC pubblica con caricamento cache-safe e boundary per parametri/sessione.
3. Renderizzare tutti i field type in step lineari, con validation client, annunci accessibili e progress derivato da `definition.copy`.
4. Collegare submit, token anonimo in cookie, rate limit, duplicate submit e stati chiuso/completato.
5. Implementare resume IndexedDB versionato, senza persistere dati oltre la vita utile del questionario.
6. Aggiungere risultati aggregati solo per questionari `CLOSED` e solo per campi `publicResults` compatibili.
7. Testare accessibilità, mobile, sicurezza token/rate limit e invarianti di stato; eseguire lint, typecheck e test.

### Fuori perimetro

- Blocco home e dashboard.
- Modifiche a schema Prisma, contratti pubblici o regole server-side senza decisione esplicita.

### Criteri di completamento

- Solo un questionario pubblicato è disponibile pubblicamente.
- Il renderer supporta tutti i tipi field e i suoi testi provengono da `definition.copy`.
- Un browser non può inviare due volte e può riprendere una bozza coerente.
- Risultati pubblici restano aggregati e disponibili solo dopo chiusura.
