# Checklist: Ricerca E Articoli Piu Letti

## Decisioni Confermate

- [x] Calcolare la popolarita sugli ultimi 90 giorni.
- [x] Ordinare per pageview Umami.
- [x] Usare gli ultimi 10 articoli pubblicati come fallback.
- [x] Confermare che il limite di 10 si applica anche alla ricerca globale, non solo ai suggerimenti.

## Dati Applicativi

- [x] Aggiungere il modello Prisma `ArticlePopularity`.
- [x] Salvare `articleId`, `pageviews`, `windowStart`, `windowEnd` e `syncedAt`.
- [x] Aggiungere relazione univoca con `Article` e indice per l'ordinamento della classifica.
- [x] Creare e validare una migrazione Prisma additiva.
- [x] Escludere bozze, archiviati e articoli non piu pubblicamente visibili.

## Sincronizzazione Umami

- [x] Verificare la versione Umami deployata: e `3.2.0`, senza supporto API key.
- [x] Registrare username/password Umami in un file segreto dedicato sulla VPS, fuori dal repository.
- [x] Verificare il `websiteId` di `middleware.media`.
- [x] Verificare la compatibilita dell'API metriche con Umami `3.2.0`.
- [x] Usare l'endpoint `metrics/expanded` con `type=path` ed `eventType=1`.
- [x] Richiedere pageview degli ultimi 90 giorni usando timestamp espliciti.
- [x] Gestire la paginazione con `limit` e `offset`.
- [x] Accettare solo pathname canonici `/articoli/:slug`.
- [x] Ignorare URL legacy, CMS, pagine non editoriali e pathname non riconosciuti.
- [x] Associare gli slug agli articoli pubblici dell'applicazione.
- [x] Ordinare a parita di pageview per data di pubblicazione e titolo.
- [x] Aggiornare la classifica in transazione solo dopo una risposta Umami valida.
- [x] Conservare l'ultima classifica valida se Umami non risponde o restituisce dati invalidi.
- [x] Non registrare token, credenziali o risposte complete nei log.

## Job E Timer VPS

- [x] Creare uno script di sincronizzazione dedicato.
- [x] Creare un target Docker `jobs` per l'esecuzione one-shot.
- [x] Aggiornare il deploy per costruire e taggare l'immagine jobs.
- [x] Creare `/opt/middleware/bin/sync-popular-articles.sh` sulla VPS.
- [x] Proteggere il job da esecuzioni concorrenti con `flock`.
- [x] Usare un file env dedicato al job, con permessi restrittivi.
- [x] Consentire al job l'accesso al DB applicativo e all'API HTTPS di Umami.
- [x] Impedire qualsiasi accesso a `umami-postgres` e ai relativi segreti.
- [ ] Leggere le unita systemd correnti con `systemctl cat` prima di modificarle.
- [x] Creare `middleware-popular-articles.service` come servizio `oneshot` eseguito da `deploy`.
- [x] Creare `middleware-popular-articles.timer` giornaliero alle `02:30 UTC`.
- [x] Impostare `RandomizedDelaySec=15m` e `Persistent=true`.
- [x] Eseguire e verificare manualmente il servizio prima di abilitare il timer.
- [x] Verificare timer e log con `systemctl list-timers` e `journalctl`.

## API E Ricerca

- [x] Aggiungere la query server per i suggerimenti iniziali.
- [x] Restituire fino a 10 articoli popolari quando il campo e vuoto.
- [x] Usare gli ultimi 10 articoli pubblicati se la classifica e assente, obsoleta o inutilizzabile.
- [x] Ridurre da 12 a 10 il limite della ricerca testuale nel menu.
- [x] Mantenere la ricerca full-text globale per query di almeno due caratteri.
- [x] Evitare di mostrare risultati della query precedente durante debounce o caricamento.

## Interfaccia

- [x] Rimuovere il testo "Inserisci almeno due caratteri".
- [x] Portare il pannello a `100dvh`.
- [x] Mantenere header e input fissi, con elenco risultati scrollabile.
- [x] Limitare ogni elenco a 10 elementi.
- [x] Aggiungere un controllo per svuotare il campo di ricerca.
- [x] Aggiungere una regione live per risultati, caricamento ed errori.
- [x] Conservare focus iniziale, `Escape`, focus trap, ripristino focus e movimento ridotto.
- [ ] Verificare la resa su desktop e mobile.

## Test E Rilascio

- [x] Testare parsing pathname, paginazione e validazione della risposta Umami.
- [ ] Testare token mancante, timeout, risposta invalida e fallback.
- [ ] Testare filtraggio degli articoli non pubblici.
- [ ] Testare ordinamento e tie-break della classifica.
- [x] Testare suggerimenti e limite di 10.
- [ ] Testare stati del menu: campo vuoto, ricerca, debounce, caricamento ed errore.
- [ ] Testare tastiera, focus, chiusura e navigazione dei risultati.
- [x] Eseguire `pnpm lint`.
- [x] Eseguire `pnpm typecheck`.
- [x] Eseguire `pnpm test:run`.
- [x] Eseguire `pnpm build`.
- [x] Creare backup DB e seguire i pre-check di `docs/production-ops.md`.
- [x] Applicare la migrazione con il flusso production data-safe.
- [x] Eseguire il primo sync manuale e verificare la classifica.
- [x] Abilitare il timer solo dopo una prima esecuzione positiva.
- [x] Aggiornare `docs/production-ops.md` con installazione, controlli e rollback.
- [x] Aggiornare `docs/architecture.md` con il confine tra Umami e classifica applicativa.
