# Home Dinamica: Casistiche e Proposte

Questo documento raccoglie le casistiche da considerare per evolvere la home pubblica verso una composizione dinamica. Le proposte privilegiano soluzioni progressive: prima euristiche basate sui dati gia disponibili, poi eventuali metadata CMS.

## 1. Piu editoriali

**Problema:** oggi il blocco editoriale usa solo il primo articolo editoriale; eventuali altri editoriali rischiano di non comparire.

**Proposta:** mantenere il primo editoriale come `EditorialLead` e reinserire gli editoriali successivi in una sezione dinamica `Editoriali`. In futuro, consentire al CMS di scegliere l'editoriale principale tramite `isFeatured` o un campo dedicato.

## 2. Editoriale senza immagine

**Problema:** il layout attuale lascia il blocco sbilanciato se manca `imageUrl`.

**Proposta:** introdurre una variante testuale full-width per `EditorialLead` quando non c'e immagine. La variante dovrebbe aumentare peso tipografico di titolo/excerpt e rimuovere lo spazio riservato all'immagine.

## 3. Editoriale senza excerpt

**Problema:** il blocco perde gerarchia e densita informativa.

**Proposta:** se `excerpt` e assente, mostrare solo titolo e metadata con spaziatura ridotta. In alternativa, generare un excerpt breve da `contentRich` lato service o view model.

## 4. Nessun editoriale

**Problema:** la home parte direttamente dalle sezioni categoria, senza contenuto di apertura.

**Proposta:** usare come lead automatico il primo articolo `isFeatured`; se non esiste, usare il primo articolo per `position`. Questo fallback dovrebbe essere esplicito nel view model.

## 5. Molte categorie con pochi articoli

**Problema:** troppe sezioni da uno o due articoli rendono la home frammentata.

**Proposta:** sotto una soglia configurabile, aggregare le categorie minori in una sezione `Altri contenuti`, mantenendo label categoria dentro ogni card. La soglia iniziale puo essere: categorie con un solo articolo dopo le prime tre sezioni.

## 6. Categoria con molti articoli

**Problema:** una categoria molto popolata puo rendere la home troppo lunga.

**Proposta:** mostrare un massimo iniziale di articoli per sezione, ad esempio 6. Il resto andra gestito con link alla pagina categoria/numero o con paginazione in una fase successiva.

## 7. Griglia dinamica per numero card

**Problema:** lo stesso layout non funziona bene con 1, 2, 3 o molti articoli.

**Proposta:** introdurre un planner deterministico per sezione, non una griglia `auto-fit` lasciata al caso:

- 1 articolo: card full-width o card hero.
- 2 articoli: split 50/50.
- 3 articoli: 3 card sulla stessa riga desktop.
- 4 articoli: 4 card sulla stessa riga desktop.
- 5 articoli: 3 sopra e 2 sotto.
- 6 articoli: 3 sopra e 3 sotto.
- 7 articoli: 3 sopra e 4 sotto.
- 8 articoli: 4 sopra e 4 sotto.
- 9 articoli: 3 x 3.
- 10 articoli: 5 sopra e 5 sotto.
- Sopra 10 articoli: mostrare i primi 10 e CTA `Vedi tutti`.

Su mobile ogni pattern deve degradare in lista a una colonna. Il planner deve essere una funzione pura testabile, cosi il layout resta prevedibile e modificabile senza cambiare markup in piu punti.

## 8. Articoli senza immagine

**Problema:** le card senza immagine possono apparire povere o sbilanciate rispetto alle altre. Inoltre le card di categorie diverse, come interviste e contributi, non devono divergere in UI solo per il tipo categoria.

**Proposta:** usare una sola UI card per tutte le categorie, basata sulla variante contributi: numero grande, label categoria, eventuale immagine, titolo, excerpt e metadata. Quando manca `imageUrl`, non mostrare placeholder fotografici; usare invece una variante tipografica pulita con titolo leggermente piu grande ed excerpt piu visibile.

## 9. Mix immagini si/no nella stessa categoria

**Problema:** una griglia con alcune immagini e alcune card testuali puo risultare disomogenea.

**Proposta:** decidere il layout della sezione in base alla percentuale di articoli con immagine. Se meno del 50% ha immagine, usare layout testuale per tutta la sezione; altrimenti mantenere immagini dove presenti.

## 10. Articoli featured

**Problema:** oggi `isFeatured` influenza solo l'ordine, non il layout.

**Proposta:** usare `isFeatured` come driver visuale. Un featured per sezione diventa card principale; piu featured possono formare una fascia iniziale. Se non ci sono featured, si usa `position`.

## 11. Ordinamento categorie

**Problema:** oggi le categorie sono ordinate per posizione minima degli articoli, ma non e un controllo editoriale diretto.

**Proposta:** mantenere l'euristica attuale nel breve. In seguito aggiungere `sortOrder` su `Category` o una configurazione per issue quando serve controllo manuale.

## 12. Categorie speciali

**Problema:** trattare categorie speciali tramite slug hardcoded puo diventare fragile.

**Proposta:** limitare l'hardcoding a `editoriale` come compatibilita temporanea. In futuro introdurre metadata su categoria, ad esempio `homeRole`, con valori come `lead`, `standard`, `archiveOnly`.

## 13. Categoria senza nome/slug

**Problema:** il DTO pubblico permette categoria nulla, anche se il DB richiede `categoryId`.

**Proposta:** mantenere fallback `Senza categoria` nel view model. Va trattato come guardrail difensivo, non come flusso editoriale normale.

## 14. Numero corrente senza articoli pubblicati

**Problema:** la home mostra hero del numero ma nessuna sezione.

**Proposta:** mostrare uno stato dedicato sotto la hero, ad esempio `Contenuti in preparazione`, oppure nascondere il numero corrente finche non contiene almeno un articolo pubblicato.

## 15. Nessun numero corrente

**Problema:** viene mostrato l'empty state della home; l'archivio puo comunque apparire se ci sono numeri pubblicati.

**Proposta:** mantenere lo stato attuale, ma rendere il messaggio piu operativo: spiegare che non c'e un numero corrente e valorizzare l'archivio quando disponibile.

## 16. Link articoli mancanti

**Problema:** le card articolo non linkano ancora a una pagina articolo.

**Proposta:** quando esistera `/articoli/:slug`, trasformare `IssueArticleCard` in link accessibile. Nel frattempo evitare CTA che promettono apertura articolo.

## 17. Link uscita archivio non supportato

**Problema:** l'archivio linka a `/uscite/:slug`, ma la route pubblica potrebbe non essere ancora implementata.

**Proposta:** implementare la pagina uscita prima di rendere centrale l'archivio, oppure disabilitare/convertire temporaneamente il link in ancora non navigabile.

## 18. Header/menu con sezioni dinamiche

**Problema:** il menu non riflette le categorie dinamiche della home.

**Proposta:** generare link di navigazione dalle sezioni costruite dal view model. Mantenere sempre link fissi a `#top`, `#archivio` e footer.

## 19. SEO e heading structure

**Problema:** sezioni dinamiche possono rompere gerarchia semantica se non controllate.

**Proposta:** mantenere un solo `h1` nella hero, usare `h2` per sezioni e `h3` per card. Se manca editoriale, non promuovere automaticamente altri titoli a `h1`.

## 20. Titoli molto lunghi

**Problema:** titoli issue, categorie o articoli lunghi possono rompere layout e mobile.

**Proposta:** definire limiti visuali con `max-width`, `text-wrap: balance` dove utile, font clamp e test di contenuti lunghi. Non troncare titoli editoriali salvo casi estremi.

## 21. Responsive mobile

**Problema:** layout mosaico o griglie complesse possono degradare male su mobile.

**Proposta:** ogni preset desktop deve avere fallback mobile lineare. Mobile-first: card stacked, spaziature ridotte, immagini con ratio coerente.

## 22. Accessibilita immagini

**Problema:** oggi molte immagini hanno `alt=""`, quindi sono decorative.

**Proposta:** se l'immagine e parte informativa della card, aggiungere campo CMS per alt text o derivare un alt minimo dal titolo. Se resta decorativa, mantenere `alt=""`.

## 23. Audio/podcast

**Problema:** `hasAudio` e solo un badge, ma potrebbe essere un contenuto primario.

**Proposta:** introdurre una variante card audio quando `hasAudio` e true, con badge piu forte e, in futuro, player inline o link diretto all'audio.

## 24. Autori multipli

**Problema:** il modello pubblico espone un solo `authorName`.

**Proposta:** mantenere un autore singolo finche il modello DB resta cosi. Se emerge necessita editoriale, introdurre relazione molti-a-molti `ArticleAuthor` prima di cambiare UI.

## 25. Tag come driver layout

**Problema:** le categorie potrebbero non bastare per distinguere formati come dossier, longform, audio o speciale.

**Proposta:** usare i tag come segnali secondari di layout solo dopo averli esposti nel DTO pubblico. Non sovraccaricare le categorie con significati di formato.

## 26. Layout per numero/issue

**Problema:** ogni numero potrebbe richiedere una composizione specifica.

**Proposta:** nel medio periodo valutare metadata su `Issue`, ad esempio `homeLayoutPreset` o `homeConfig`. Iniziare con preset limitati, non con builder libero.

## 27. Layout per categoria

**Problema:** alcune categorie potrebbero richiedere comportamento ricorrente specifico.

**Proposta:** aggiungere in futuro campi su `Category`: `sortOrder`, `showInHome`, `homeLayout`, `homeRole`. Questa e la soluzione piu stabile per evitare hardcoding sugli slug.

## 28. Layout per articolo

**Problema:** singoli articoli potrebbero dover controllare dimensione/prominenza in home.

**Proposta:** usare prima `isFeatured` e `position`. Solo se non bastano, aggiungere metadata articolo come `homeVariant` o `hideFromHome`.

## 29. Limiti editoriali

**Problema:** una home completamente dinamica puo diventare ingestibile se il CMS permette combinazioni troppo ampie.

**Proposta:** definire limiti applicativi: massimo sezioni visibili, massimo articoli per sezione, fallback per categorie minori, comportamento chiaro per contenuti mancanti.

## 30. Stati di pubblicazione incoerenti

**Problema:** issue pubblicata con pochi contenuti, articoli pubblicati senza dati completi o media mancanti possono produrre stati strani.

**Proposta:** mantenere filtri backend su `PUBLISHED` e `publishedAt`, aggiungere guardrail visuali lato home e, in seguito, validazioni CMS prima della pubblicazione del numero.

## Priorita di implementazione suggerita

1. Gestire piu editoriali senza perdere contenuti.
2. Gestire editoriale senza immagine con layout dedicato.
3. Introdurre preset griglia per numero di card.
4. Usare `isFeatured` come driver di layout.
5. Aggiungere metadata CMS solo quando le euristiche non bastano piu.
