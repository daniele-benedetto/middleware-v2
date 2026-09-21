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
- [ ] Escludere bozze, archiviati e articoli non piu pubblicamente visibili.

## Sincronizzazione Umami

- [ ] Creare una API key Umami dedicata e revocabile, con permessi minimi di lettura.
- [ ] Registrare la API key in un file segreto dedicato sulla VPS, fuori dal repository.
- [ ] Verificare il `websiteId` di `middleware.media`.
- [ ] Verificare la versione Umami deployata e la compatibilita dell'API metriche.
- [ ] Usare l'endpoint `metrics/expanded` con `type=path` ed `eventType=1`.
- [ ] Richiedere pageview degli ultimi 90 giorni usando timestamp espliciti.
- [ ] Gestire la paginazione con `limit` e `offset`.
- [ ] Accettare solo pathname canonici `/articoli/:slug`.
- [ ] Ignorare URL legacy, CMS, pagine non editoriali e pathname non riconosciuti.
- [ ] Associare gli slug agli articoli pubblici dell'applicazione.
- [ ] Ordinare a parita di pageview per data di pubblicazione e titolo.
- [ ] Aggiornare la classifica in transazione solo dopo una risposta Umami valida.
- [ ] Conservare l'ultima classifica valida se Umami non risponde o restituisce dati invalidi.
- [ ] Non registrare token, credenziali o risposte complete nei log.

## Job E Timer VPS

- [x] Creare uno script di sincronizzazione dedicato.
- [x] Creare un target Docker `jobs` per l'esecuzione one-shot.
- [x] Aggiornare il deploy per costruire e taggare l'immagine jobs.
- [ ] Creare `/opt/middleware/bin/sync-popular-articles.sh` sulla VPS.
- [ ] Proteggere il job da esecuzioni concorrenti con `flock`.
- [ ] Usare un file env dedicato al job, con permessi restrittivi.
- [ ] Consentire al job l'accesso al DB applicativo e all'API HTTPS di Umami.
- [ ] Impedire qualsiasi accesso a `umami-postgres` e ai relativi segreti.
- [ ] Leggere le unita systemd correnti con `systemctl cat` prima di modificarle.
- [ ] Creare `middleware-popular-articles.service` come servizio `oneshot` eseguito da `deploy`.
- [ ] Creare `middleware-popular-articles.timer` giornaliero alle `02:30 UTC`.
- [ ] Impostare `RandomizedDelaySec=15m` e `Persistent=true`.
- [ ] Eseguire e verificare manualmente il servizio prima di abilitare il timer.
- [ ] Verificare timer e log con `systemctl list-timers` e `journalctl`.

## API E Ricerca

- [x] Aggiungere la query server per i suggerimenti iniziali.
- [x] Restituire fino a 10 articoli popolari quando il campo e vuoto.
- [x] Usare gli ultimi 10 articoli pubblicati se la classifica e assente, obsoleta o inutilizzabile.
- [x] Ridurre da 12 a 10 il limite della ricerca testuale nel menu.
- [ ] Mantenere la ricerca full-text globale per query di almeno due caratteri.
- [ ] Evitare di mostrare risultati della query precedente durante debounce o caricamento.

## Interfaccia

- [x] Rimuovere il testo "Inserisci almeno due caratteri".
- [x] Portare il pannello a `100dvh`.
- [x] Mantenere header e input fissi, con elenco risultati scrollabile.
- [ ] Mostrare l'etichetta "Piu letti" per i suggerimenti da Umami.
- [ ] Mostrare l'etichetta "Ultimi pubblicati" quando e attivo il fallback.
- [x] Limitare ogni elenco a 10 elementi.
- [x] Aggiungere un controllo per svuotare il campo di ricerca.
- [x] Aggiungere una regione live per risultati, caricamento ed errori.
- [x] Conservare focus iniziale, `Escape`, focus trap, ripristino focus e movimento ridotto.
- [ ] Verificare la resa su desktop e mobile.

## Test E Rilascio

- [ ] Testare parsing pathname, paginazione e validazione della risposta Umami.
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
- [ ] Creare backup DB e seguire i pre-check di `docs/production-ops.md`.
- [ ] Applicare la migrazione con il flusso production data-safe.
- [ ] Eseguire il primo sync manuale e verificare la classifica.
- [ ] Abilitare il timer solo dopo una prima esecuzione positiva.
- [ ] Aggiornare `docs/production-ops.md` con installazione, controlli e rollback.
- [ ] Aggiornare `docs/architecture.md` con il confine tra Umami e classifica applicativa.
