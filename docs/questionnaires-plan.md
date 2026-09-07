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
- `Questionnaire.titleStyled` è persistito con migrazione additiva. Non sono ancora implementati pagina pubblica, IndexedDB/resume, blocco home e dashboard.
- Le risposte CMS sono implementate: route RSC, lista paginata, dettaglio in dialog e interpretazione dei valori dal `definitionSnapshot`. Il dettaglio tRPC richiede anche `questionnaireId`, impedendo l'accesso a una risposta da un altro percorso questionario.
- L'export CSV è implementato via tRPC protetto e auditato, con colonne derivate dagli snapshot, quoting CSV e protezione da formule spreadsheet.
- Il renderer pubblico è implementato in `/questionari/[slug]`: step lineari, tutti i field type, submit pubblico, stati completato/chiuso, resume IndexedDB e risultati aggregati per i campi autorizzati.

## Prossima attivita: Integrazione home pubblica

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

### Criteri di completamento

- Solo un questionario pubblicato è disponibile pubblicamente.
- Il renderer supporta tutti i tipi field e i suoi testi provengono da `definition.copy`.
- Un browser non può inviare due volte e può riprendere una bozza coerente.
- Risultati pubblici restano aggregati e disponibili solo dopo chiusura.

## Attivita successive

### 1. Integrazione home pubblica

**Obiettivo:** rendere raggiungibili i questionari pubblicati senza alterare i fallback editoriali esistenti.

1. Definire il criterio editoriale di esposizione: questionario singolo in evidenza o elenco, ordine e comportamento quando non ne esistono di pubblicati.
2. Estendere il fetch pubblico cache-safe per ottenere solo questionari `PUBLISHED` con dati minimi: titolo, titolo decorato, slug e descrizione necessaria.
3. Aggiungere il blocco alla home rispettando griglia, tipografia e responsive del design system; usare CTA verso la route pubblica canonica.
4. Verificare che bozze, chiusi e archiviati non siano mostrati né deducibili dalla home.

### 2. Dashboard CMS questionari

**Obiettivo:** fornire una sintesi operativa, senza duplicare la lista o le risposte esistenti.

1. Definire metriche a basso costo: questionari per stato, risposte totali, ultime risposte e questionari da chiudere.
2. Creare query tRPC e DTO dedicati, autorizzati dalle policy questionari e con output validato.
3. Implementare card CMS con CTA verso lista, builder e risposte; coprire loading, empty, error e responsive.
4. Evitare aggregazioni costose nel render iniziale; usare cache o query esplicite quando necessario.

### 3. Quality Gate pubblico

**Obiettivo:** consolidare il flusso end-to-end prima della pubblicazione reale.

1. Aggiungere test unitari per renderer, progressione, validazione, resume IndexedDB e aggregazione risultati.
2. Verificare manualmente mobile, tastiera, focus, screen reader, zoom e `prefers-reduced-motion`.
3. Verificare invio multiplo, token/cookie, rate limit, chiusura durante il flusso e cancellazione questionario con bozza locale residua.
4. Eseguire `pnpm lint`, `pnpm typecheck`, `pnpm test:run` e `pnpm build`.

## Vincoli per le attivita rimanenti

- Non introdurre route API HTTP: l'interfaccia applicativa resta tRPC-only.
- Non esporre risposte individuali, token o dati di bozza nei fetch e componenti pubblici.
- Ogni testo frontend pubblico deve provenire da `definition.copy`; ogni testo CMS da i18n.
- Non modificare la struttura di un questionario dopo `firstResponseAt`, neppure attraverso nuove interfacce.
