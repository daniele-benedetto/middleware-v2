# Observability Quality Model

Questo documento definisce il modello teorico e funzionale per rendere professionali i contenuti CMS `audit`, `errors`, `performance` e `telemetry`.

L'obiettivo non è produrre dati quantitativi superficiali, ma dati qualitativi: segnali che aiutano a capire intenzione, impatto, rischio, frizione e valore reale.

Rispetto alla prima stesura, questa versione chiude quattro buchi che reggevano l'intero modello e che erano nominati ma non progettati: l'algoritmo del tempo attivo, la formula del quality score, la regola di fingerprint degli errori, e l'identità del visitatore. In più risolve una contraddizione sui ritorni multi-giorno, separa in modo esplicito i campi catturati dai campi derivati, sposta bot filtering e rate limit dove servono davvero, e aggiunge alerting, stima volumi e calibrazione delle soglie.

## Regole Generali

### Stato del progetto e retrocompatibilità

Il progetto è ancora in fase di sviluppo e non ha dati storici da preservare. Tutto ciò che è stato implementato finora per telemetry, performance, errors e audit va considerato provvisorio: se un modello, una tabella, un DTO, una route, un collector, un aggregate o una UI non sono coerenti con questo documento, si possono buttare via e rifare da zero.

Regola operativa: niente retrocompatibilità preventiva. Non si mantengono doppi modelli, adapter legacy, mapping vecchio-nuovo, colonne ponte o comportamenti storici solo per proteggere codice provvisorio. La soluzione corretta è riscrivere in modo netto, piccolo e verificabile, seguendo le fasi sotto. La compatibilità va considerata solo se in futuro esisteranno dati reali, deploy multi-ambiente, consumer esterni o un requisito esplicito di prodotto.

Conseguenze pratiche:

- Le tabelle attuali possono essere rimosse o sostituite senza migrazioni conservative.
- Gli eventi attuali come `page_view` possono essere declassati a raw event tecnico o eliminati se non servono al nuovo modello.
- Gli aggregati attuali basati su views non sono fonte autorevole per la nuova UI.
- Il fingerprint errori esistente può essere sostituito con un algoritmo versionato senza preservare la storia precedente.
- La UI CMS esistente può essere rifatta se continua a privilegiare conteggi grezzi invece di segnali qualitativi.
- Ogni fase deve lasciare il sistema funzionante, ma non deve mantenere compatibilità con implementazioni provvisorie incoerenti.

### Principio guida

Il sistema non deve rispondere prima di tutto alla domanda "quante volte è successo?".

Deve rispondere a domande più utili:

- Quanto è intenzionale questo comportamento?
- Quanto è significativo rispetto al contenuto?
- Quanto impatta l'esperienza dell'utente?
- Quanto è rischioso per il CMS o per la pubblicazione?
- Quanto è collegato a errori, lentezza o abbandono?
- Quanto è ripetuto in modo utile, e non solo tecnico?
- Quanto aiuta una decisione editoriale, tecnica o operativa?

Una page view isolata vale poco. Una lettura completa, un ritorno dopo giorni, una pagina abbandonata dopo LCP poor, un errore che blocca un upload o una pubblicazione riuscita dopo molte modifiche valgono molto di più.

### Dato grezzo e dato interpretato

Il sistema separa due livelli:

- Evento grezzo: qualcosa è accaduto in un momento preciso.
- Episodio interpretato: il sistema ha capito il significato qualitativo di una sequenza di eventi.

Esempio:

```text
Evento grezzo:
page_view /articoli/example 10:00:01
scroll 52% 10:00:34
visibility_hidden 10:01:12

Episodio interpretato:
lettura engaged, durata attiva 71s, scroll medio, non completata
```

La UI CMS non lavora principalmente sugli eventi grezzi. Gli eventi grezzi servono per audit tecnico, debug e ricostruzione. La UI mostra episodi, qualità e impatto.

**Regola architetturale forte.** Un campo interpretato non vive mai come colonna autorevole su una tabella di cattura. `engagementLevel`, `perceivedQuality`, `completed`, `exitType`, `severity`, `riskLevel` sono classificazioni che dipendono da eventi futuri o da combinazioni di segnali, e non sono note nel momento in cui scrivi il primo evento. Possono comparire su una tabella di cattura solo come valore provvisorio nullable, esplicitamente marcato come stima, oppure vivono solo sulle tabelle derivate prodotte da job. La fonte di verità per ogni metrica qualitativa è la tabella derivata, non quella grezza. Questo è il motivo per cui più avanti ogni schema annota i campi come `catturato` o `derivato`.

### Autorità dei timestamp

I clock client sono inaffidabili e manipolabili, quindi non possono essere la fonte di verità per ordinamento e durate.

Regola:

- Ogni evento ha un tempo server autorevole, `receivedAtServer`, e un riferimento client non autorevole espresso come `clientSequence` e/o `clientElapsedMs`. Il monotonic clock del browser (`performance.now()`) non è un timestamp assoluto: serve solo per ordinare eventi dentro la stessa pagina e calcolare delta locali.
- Le durate (tempo attivo, durata sessione) si calcolano da delta monotonici lato client, non da differenze di wall clock, e arrivano al server come valori già aggregati con bound di sanità.
- L'ordinamento di audit e di occorrenze errore usa sempre `receivedAtServer`.
- Uno scostamento eccessivo tra tempo client e tempo server è di per sé un segnale (clock manomesso, replay, bot) e va marcato.

### Identità del visitatore e privacy

Il modello usa due livelli di identità, entrambi privacy-safe, e una decisione esplicita su cosa è misurabile e cosa no.

- **Sessione (affidabile).** `sessionId` anonimo in `sessionStorage`, valido finché la sessione è attiva. Dopo 30 minuti di inattività il client deve ruotarlo/generarne uno nuovo, anche se la tab è rimasta aperta. Riconosce con precisione refresh e ritorni nella stessa sessione attiva.
- **Visitatore giornaliero (approssimato).** `visitorHash` = hash lato server di `(ip + user-agent + salt giornaliero a rotazione)`. Ruota ogni giorno. Riconosce "questo visitatore è tornato più tardi nello stesso giorno", ma è approssimato perché IP condivisi collidono.

**Decisione sul ritorno multi-giorno.** Con un salt a rotazione giornaliera non è meccanicamente possibile riconoscere lo stesso visitatore a distanza di giorni: l'hash di tre giorni fa è diverso da quello di oggi. La prima stesura prometteva sia la rotazione giornaliera sia il segnale "ritorno dopo giorni → returningVisitor": le due cose sono incompatibili. La scelta di default, coerente con il contesto UE/Italia, è privacy-first: niente identità per-visitatore cross-day. Il segnale "interesse ricorrente" viene riformulato a livello di contenuto, non di persona.

In pratica: invece di chiedere "questo visitatore è tornato dopo tre giorni?", il sistema chiede "questo contenuto continua a ricevere letture qualificate in giorni diversi?". È un dato aggregato (`DailyQualityAggregate` su più giorni) e dice esattamente la cosa editorialmente utile ("questo articolo non smette di essere letto") senza tracciare nessuno. Se in futuro serve davvero il ritorno per-visitatore cross-day, richiede un identificatore persistente lato client con consenso esplicito, ed è una decisione di prodotto separata, non un default tecnico.

**Stance privacy/GDPR.** Anche quando i dati utente sono hashati o pseudonimizzati, il sistema resta nel perimetro GDPR. L'obiettivo tecnico è minimizzazione e controllo del rischio, non dichiarare che il trattamento non esista. Niente cookie marketing non necessari, niente body request, niente Authorization header, niente token, niente query string sensibili, niente dato personale non necessario. Hashing solo lato server e solo per aggregazione. Rispetto di Do Not Track e Global Privacy Control: in presenza di questi segnali il collector riduce la raccolta al livello minimo. La raccolta opzionale basata su consenso, cookie banner e privacy policy è una decisione di prodotto/compliance esplicita: se l'utente non acconsente, il sistema degrada verso dati aggregati minimi o disattiva i segnali non essenziali.

### Sessione anonima come unità minima

Una sessione è un periodo di interazione anonima e temporanea. Non identifica necessariamente una persona reale. Serve a capire continuità, ritorni, sequenze e frizione.

Regola:

- Nuova sessione dopo 30 minuti di inattività.
- `sessionId` in `sessionStorage`, rigenerato dopo 30 minuti di inattività, `visitorHash` giornaliero come sopra.
- Sessioni marcate come probabili bot vengono salvate ma escluse di default dagli aggregati qualitativi (vedi Bot filtering).

Modello concettuale:

```ts
ObservabilitySession {
  id                    // catturato
  visitorHash           // catturato (hash server, salt giornaliero)
  startedAt             // catturato (server)
  endedAt               // derivato (chiusura o timeout)
  landingPath           // catturato
  exitPath              // derivato (ultimo path della sessione)
  referrerType          // derivato (normalizzazione referrer)
  referrerDomain        // catturato (normalizzato server)
  country               // catturato (header affidabili)
  deviceType            // derivato (da user-agent, non invasivo)
  browser               // derivato
  os                    // derivato
  isReturningVisitor    // derivato, same-day only, bassa confidenza
  isLikelyBot           // derivato (euristiche bot)
  pageCount             // derivato
  engagedPageCount      // derivato
  totalActiveTimeMs     // derivato (somma tempo attivo)
  qualityScore          // derivato (vedi Quality score)
}
```

### Ritorni sulla stessa pagina

Se un utente torna più volte nella stessa pagina, non bisogna contare ogni ritorno come una nuova visita equivalente. Bisogna interpretare il tipo di ritorno.

| Caso                                   | Interpretazione                        | Decisione dati                                                                | Affidabilità         |
| -------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------- | -------------------- |
| Refresh entro pochi secondi            | Rumore tecnico o tentativo di recupero | Non nuova visita; incrementare `refreshCount`                                 | Alta                 |
| Ritorno nella stessa sessione          | Revisita interna                       | Incrementare `returnInSessionCount`                                           | Alta                 |
| Ritorno dopo 30+ minuti, stesso giorno | Nuova sessione                         | Nuova sessione, stesso `visitorHash` se ancora valido                         | Media (IP condivisi) |
| Ritorno dopo giorni                    | Interesse ricorrente                   | Non per-visitatore; rilevato a livello di contenuto su aggregati multi-giorno | Solo aggregato       |
| Pagina aperta e subito chiusa          | Glance o bounce                        | `engagementLevel = "glance"`                                                  | Alta                 |
| Scroll e tempo attivo significativi    | Lettura reale                          | `engagementLevel = "engaged"`                                                 | Alta                 |
| Lettura quasi completa                 | Contenuto consumato                    | `engagementLevel = "completed"`                                               | Alta                 |

La risposta alla domanda "contiamo?" è: sì, ma non come semplice `+1 page view`. Il ritorno diventa un segnale qualitativo, con un livello di affidabilità esplicito.

Un ritorno può indicare interesse reale, confusione nella navigazione, refresh da errore o lentezza, contenuto utile da consultare più volte, navigazione circolare, problema UX. Il sistema raccoglie abbastanza contesto per distinguere questi casi, ma è onesto su quali distinzioni sono affidabili e quali no.

### Tempo attivo: algoritmo

Il tempo attivo è il dato portante del modello: regge `engaged`, `completed`, le soglie referrer e il quality score. Va definito in modo riproducibile, non descritto come "heartbeat leggero".

Definizione operativa:

- **Heartbeat** ogni 15 secondi mentre la pagina è considerata attiva.
- **Attiva** significa, contemporaneamente: `document.visibilityState === "visible"`, finestra a fuoco, e almeno una interazione utente (scroll, pointer, key) negli ultimi `idleThreshold` (default 30s). Niente di tutto questo deve essere automatico.
- A ogni heartbeat si aggiunge `min(deltaDallUltimoHeartbeat, maxHeartbeatGap)` a `activeTimeMs`, con `maxHeartbeatGap` (default 20s) che limita il contributo del singolo intervallo. Così un intervallo perso o andato in background non aggiunge un delta enorme.
- Su `visibility_hidden` o `page_exit` si aggiunge `min(deltaDallUltimoHeartbeat, idleThreshold)` solo se la pagina è ancora attiva nel momento dell'uscita.
- I gap di idle oltre soglia vengono scartati (cappati), non accumulati.
- Tutti i delta si calcolano dal monotonic clock (`performance.now()`), non dal wall clock, per immunità allo skew di sistema.

Criterio di verifica: una tab lasciata aperta in background per 40 minuti produce tempo attivo prossimo a zero, non 40 minuti.

### Engagement invece di page views

La metrica primaria non è `views`, ma `qualified engagement`.

```ts
EngagementLevel = "glance" | "scan" | "engaged" | "completed";
```

Criteri indicativi:

- `glance`: permanenza brevissima, nessuno scroll rilevante.
- `scan`: scroll o tempo minimo, ma nessuna evidenza di lettura.
- `engaged`: tempo attivo e scroll coerenti con consumo reale.
- `completed`: soglia alta di scroll, tempo attivo adeguato, audio completato o azione finale.

Il criterio non è rigido e uguale per tutte le pagine. Una home, un articolo lungo, una pagina issue e una pagina audio hanno modi diversi di essere consumate. Le soglie numeriche concrete (es. 45-60s, scroll 85%) sono ipotesi iniziali e vanno calibrate sui dati reali, non trattate come verità (vedi Fase Calibrazione).

### Quality score: definizione

Il quality score è la metrica di testata del sistema e nella prima stesura non aveva formula. Uno score che nessuno sa riprodurre o spiegare dà falsa autorità. Va definito, deve essere ricostruibile, e in UI va sempre mostrato insieme alla sua scomposizione ("perché questo articolo è 72").

Due score distinti, perché rispondono a due domande diverse.

**Quality score di sessione (0-100).** Quanto è valsa questa sessione.

```text
base = max engagementLevel raggiunto nella sessione
  glance = 10, scan = 30, engaged = 70, completed = 90

bonus
  + più pagine engaged nella stessa sessione
  + completamento audio
  + ritorno qualitativo nella sessione

penalità
  - bounce rapido subito dopo performance poor
  - errore bloccante incontrato

score = clamp(base + bonus - penalità, 0, 100)
```

**Quality score di contenuto (0-100).** È quello editorialmente importante, calcolato in `DailyQualityAggregate` per contenuto e per giorno.

```text
componenti (ognuna normalizzata 0..1)
  completionRate   = completedReads / qualifiedVisits
  qualifiedRatio   = qualifiedVisits / totalVisits        // penalizza "molto aperto, poco letto"
  returnRate       = ritorni significativi / qualifiedVisits
  activeTimeFit    = tempo attivo medio rapportato al tempo di lettura atteso per la lunghezza
  perfPenalty      = poorPerformanceSessions / sessions
  errorPenalty     = errorImpactedSessions / sessions

pesi iniziali (da calibrare)
  0.35 completionRate
  0.20 qualifiedRatio
  0.15 returnRate
  0.15 activeTimeFit
 -0.10 perfPenalty
 -0.05 errorPenalty

qualityScore = clamp(100 * somma_pesata, 0, 100)
```

Due vincoli non negoziabili: i pesi sono default iniziali e vanno calibrati sui dati reali; lo score viene salvato sempre insieme alle sue componenti, così la UI può mostrare la scomposizione e l'admin può fidarsi del numero invece di subirlo.

### Campionamento sample-rate-aware

Il campionamento non è hardening tardivo: cambia la matematica di tutti gli aggregati, quindi è una decisione di schema e di collector.

Regola:

- Ogni evento campionato porta con sé il proprio `sampleRate`.
- I conteggi negli aggregati sono pesati per `1 / sampleRate`, non sommati grezzi.
- Medie e percentili su dati campionati richiedono strutture adatte (reservoir sampling o t-digest), non la media aritmetica dei campioni sopravvissuti.
- Il campionamento si applica solo agli eventi ad altissima frequenza (heartbeat, scroll milestone), mai agli eventi rari e critici (errori, audit, session_end).

### Bot filtering

Il bot filtering avvelena tutto ciò che viene costruito prima di esso, quindi non può stare in fondo: se l'engagement nasce contaminato, gli aggregati storici inglobano spazzatura che non puoi più ripulire. Va attivo dal collector (Fase 2).

Livello base sufficiente per iniziare:

- Denylist user-agent e pattern di bot noti.
- Assenza totale di segnali umani (mai scroll, mai interazione, timing assurdo).
- Marker headless e incongruenze tra header.
- Scostamento eccessivo tra tempo client e server.

Le sessioni probabili bot vengono salvate con `isLikelyBot = true` ma escluse di default dagli aggregati qualitativi. Restano disponibili per debug e audit. Sopra a questo, rate limit per IP e per sessione sul collector fin dal primo giorno.

### Qualità sopra volume

La UI privilegia letture qualificate, letture complete, ritorni significativi, contenuti ad alta intenzione, errori con impatto reale, performance percepita male, audit ad alto rischio. Le metriche quantitative restano come supporto secondario e diagnostico.

### Correlazione tra segnali

I quattro contenuti non vivono isolati. Il valore nasce quando si possono collegare: sessione → pagina → performance → abbandono; sessione → errore → azione fallita; audit → requestId → errore server; pubblicazione → aumento engagement contenuto; performance poor → riduzione completamento lettura.

Per questo servono identificatori comuni: `sessionId`, `requestId`, `correlationId`, `contentId`, `pageType`, `release` o `buildId`.

### Struttura dati raccomandata

Dato che il progetto è in sviluppo e non deployato, si può cambiare schema in modo netto. Questo non è però una licenza per modellare nove entità prima di vedere un solo dato reale. La regola è lo slice verticale: prima un percorso end-to-end su pochi modelli, poi si verifica sui dati veri, poi si espande (vedi Fase 1).

Entità complessive a regime:

```text
ObservabilitySession
ObservabilityEvent
ContentEngagement
PerformanceExperience
ErrorGroup
ErrorOccurrence
AuditActivity
AuditChange
DailyQualityAggregate
```

`ObservabilityEvent` resta utile come raw log append-only, ma non è la fonte primaria della UI.

```ts
ObservabilityEvent {
  id                // catturato
  sessionId         // catturato
  visitorHash       // catturato
  type              // catturato
  category          // catturato
  path              // catturato (normalizzato server)
  pageType          // catturato
  contentId         // catturato quando disponibile
  requestId         // catturato quando disponibile
  correlationId     // catturato quando disponibile
  sampleRate        // catturato (per aggregati pesati)
  metadata          // catturato (shape e dimensione limitate)
  clientSequence    // catturato (ordinamento locale, non attendibile)
  clientElapsedMs   // catturato (delta monotonic locale, non timestamp assoluto)
  receivedAtServer  // catturato (autorevole)
}
```

Gli aggregati qualitativi sono derivati da job o service:

```ts
DailyQualityAggregate {
  date                      // dimensione aggregata
  pageType                  // dimensione aggregata
  contentId                 // dimensione aggregata
  qualifiedVisits           // derivato
  completedReads            // derivato
  recurringContentDays      // derivato (sostituisce returningVisitors per-persona)
  averageActiveTimeMs       // derivato
  frustrationSignals        // derivato
  errorImpactedSessions     // derivato
  poorPerformanceSessions   // derivato
  qualityScore              // derivato
  qualityScoreComponents    // derivato (scomposizione per la UI)
}
```

### Regole UI generali

La UI resta coerente con il CMS: editoriale, severa, ad alto contrasto, senza decorazioni gratuite. Può essere più espressiva delle tabelle attuali.

Componenti shadcn di base: `Card`, `Badge`, `Table`, `Tabs`, `Sheet`, `Dialog`, `Command`, `Select`, `DateRangePicker`, `ChartContainer`, `ChartTooltip`, `ChartLegend`, `AreaChart`, `BarChart`, `LineChart`, `RadialBarChart`.

Pattern consigliati:

- Overview con score qualitativi, non solo contatori.
- Tabelle operative solo dopo le sintesi.
- Filtri sempre visibili per periodo e dimensione principale.
- Sheet laterali per filtri avanzati.
- Dialog o drawer di dettaglio con timeline e contesto.
- Badge semantici per severità, rischio, status e qualità.
- Copy button per ID tecnici: `requestId`, `fingerprint`, `auditId`, `sessionId`.
- Score sempre accompagnato dalla sua scomposizione.
- Empty state che spiega perché il dato manca e come verrà generato.
- Indicatore di affidabilità del campione dove i numeri sono piccoli.

## Telemetry

### Scopo

Telemetry spiega come le persone usano davvero il sito pubblico e quali contenuti generano valore. Non è una dashboard di traffico generica, è una lettura qualitativa di attenzione, ritorno, intenzione e consumo.

Domande a cui risponde:

- Quali contenuti vengono davvero letti?
- Quali contenuti vengono solo aperti e subito abbandonati?
- Quali pagine generano ritorni significativi?
- Quali referrer portano lettori reali e non solo traffico?
- Quali percorsi portano verso letture profonde?
- Quali contenuti audio vengono iniziati e completati?
- Quali sezioni editoriali hanno più qualità, non più volume?

### Limite del modello attuale

Il modello attuale raccoglie eventi come `page_view`, `article_view`, `issue_view`, `listen_view`, `media_open`. Il problema è che una page view non dice abbastanza: due secondi non sono una lettura, quattro ritorni in dieci minuti possono essere interesse o refresh, otto minuti in background non sono engagement, e un articolo con meno views ma più completamenti può contare più di uno molto cliccato.

### Dati da raccogliere

```ts
ContentEngagement {
  id                    // generato
  sessionId             // catturato
  visitorHash           // catturato
  contentType           // catturato: "home"|"article"|"issue"|"page"|"listen"|"media"
  contentId             // catturato
  slug                  // catturato
  path                  // catturato
  pageType              // catturato
  firstSeenAt           // derivato (primo receivedAtServer)
  lastSeenAt            // derivato (ultimo receivedAtServer)
  activeTimeMs          // derivato (algoritmo tempo attivo)
  maxScrollDepth        // catturato (max delle milestone)
  scrollMilestones      // catturato
  interactionCount      // catturato
  returnCountInSession  // derivato
  refreshCount          // derivato
  completed             // derivato (per tipo contenuto)
  engagementLevel       // derivato
  exitType              // derivato: "bounce"|"internal_navigation"|"external_exit"|"unknown"
}
```

Per contenuti audio:

```ts
AudioEngagement {
  sessionId             // catturato
  articleId             // catturato
  path                  // catturato
  started               // catturato
  completed             // derivato (da progress)
  listenedMs            // derivato
  completionRate        // derivato
  seekCount             // catturato
  replayCount           // catturato
}
```

Per referrer e campagne:

```ts
AcquisitionContext {
  sessionId             // catturato
  referrerType          // derivato: "direct"|"internal"|"search"|"social"|"external"|"campaign"
  referrerDomain        // catturato (normalizzato)
  utmSource             // catturato
  utmMedium             // catturato
  utmCampaign           // catturato
}
```

### Regole qualitative

Non tutte le visite valgono uguale. Le soglie sotto sono punti di partenza da calibrare.

- Nuova sessione con una sola page view e meno di 5 secondi attivi: `glance`.
- Lettura articolo con almeno 45-60 secondi attivi e scroll oltre il 50%: `engaged`.
- Lettura articolo con scroll oltre l'85% e tempo coerente con la lunghezza: `completed`.
- Contenuto letto in giorni diversi: segnale di interesse ricorrente, a livello di contenuto.
- Molti ritorni nella stessa sessione senza scroll: possibile confusione o navigazione circolare.
- Un referrer è qualitativo se porta sessioni engaged, non se porta molte aperture.

La lunghezza del contenuto influenza la soglia. Un articolo breve non deve richiedere lo stesso tempo di un longform.

### Metriche CMS primarie

Da mostrare prima delle page views: letture qualificate, letture complete, tempo attivo medio, ritorni significativi, completion rate, engagement score, contenuti ad alta intenzione, contenuti molto aperti ma poco letti, referrer con migliore qualità. Le page views restano come metrica secondaria o diagnostica.

### UI consigliata

La pagina `Telemetry` diventa una dashboard editoriale di qualità.

Sezioni: score generale (qualità traffico, letture qualificate, completamenti, ritorni); trend engagement con `AreaChart`; top contenuti in tabella con titolo, tipo, qualified reads, completion rate, ritorni, score; referrer qualitativi con `BarChart` ordinato per letture engaged; percorsi landing → contenuto → exit; segmenti device, country, page type.

Componenti shadcn: `Card` per gli score, `Tabs` per Contenuti/Referrer/Percorsi/Segmenti, `ChartContainer` con `AreaChart` e `BarChart`, `Table` per le liste, `Sheet` per i filtri, `Badge` per l'engagement level.

## Performance

### Scopo

Performance spiega la qualità percepita dell'esperienza, non solo i valori tecnici dei Web Vitals.

Domande a cui risponde:

- Quali pagine sono percepite lente?
- La lentezza causa abbandono?
- Il problema è su mobile, desktop, rete lenta o template specifico?
- Quali metriche impattano davvero la lettura?
- Quali contenuti hanno buona qualità nonostante traffico basso?
- Quali pagine editoriali rischiano di perdere lettori per performance?

### Limite del modello solo Web Vitals

`LCP p75 = 2.8s` è utile ma incompleto. Senza contesto non sappiamo se l'utente ha abbandonato, se la pagina era articolo, home, issue o ascolto, se il problema riguarda mobile, se il campione è troppo piccolo, se il dato è peggiorato dopo una release.

### Dati da raccogliere

```ts
PerformanceExperience {
  id                        // catturato
  sessionId                 // catturato
  path                      // catturato
  pageType                  // catturato
  contentId                 // catturato
  deviceType                // derivato: "mobile"|"tablet"|"desktop"|"unknown"
  browser                   // derivato
  os                        // derivato
  connectionType            // catturato
  effectiveConnectionType   // catturato
  saveData                  // catturato
  viewportWidth             // catturato
  viewportHeight            // catturato
  lcp                       // catturato
  inp                       // catturato
  cls                       // catturato
  fcp                       // catturato
  ttfb                      // catturato
  rating                    // derivato: "good"|"needs-improvement"|"poor"
  perceivedQuality          // derivato: "smooth"|"acceptable"|"frustrating"|"broken"
  causedEarlyExit           // derivato (noto solo all'uscita)
  release                   // catturato
  occurredAt                // catturato (receivedAtServer)
}
```

Nota: `perceivedQuality` e `causedEarlyExit` non sono noti al momento del beacon dei Vitals. Si calcolano in job, oppure al page-hide accettando che siano stime. Non vengono scritti come fatti certi nel record di cattura.

Se si aggiungono metriche server:

```ts
ServerPerformanceSample {
  requestId             // catturato
  routePath             // catturato (template, non path concreto)
  method                // catturato
  statusCode            // catturato
  durationMs            // catturato
  dbDurationMs          // catturato
  cacheStatus           // catturato
  trpcProcedure         // catturato
  createdAt             // catturato (server)
}
```

### Regole qualitative

`perceivedQuality` combina Web Vitals e comportamento:

- `smooth`: Web Vitals good e nessun segnale di frizione.
- `acceptable`: una metrica needs-improvement ma engagement normale.
- `frustrating`: LCP/INP poor o CLS rilevante, specialmente con bounce rapido.
- `broken`: errore tecnico, caricamento fallito o interazione bloccata.

La performance è più grave se impatta una pagina importante o un flusso critico: home lenta, longform con CLS poor, pagina audio con INP poor sui controlli. Una pagina marginale con pochi sample ha impatto basso finché non cresce l'evidenza, e va marcata come bassa affidabilità.

### Metriche CMS primarie

Esperienze smooth/acceptable/frustrating, pagine peggiori per qualità percepita, poor rate per page type, LCP/INP/CLS p75 per device, sessioni abbandonate dopo performance poor, regression per release, sample confidence.

### UI consigliata

La pagina `Performance` inizia con una diagnosi, non con una tabella.

Sezioni: score esperienza percepita con `RadialBarChart` o card semantiche; Core Web Vitals summary con soglie e badge; trend p75 per metrica con `LineChart`; worst pages ordinate per impatto qualitativo; segmenti device/browser con `BarChart`; dettaglio pagina con distribuzione good/needs/poor e correlazione bounce.

Formattazione: `CLS` senza unità; `LCP`, `FCP`, `INP`, `TTFB` in ms o secondi leggibili; colori semantici coerenti col CMS; sample count e affidabilità sempre visibili. FID è rimosso: è stato ufficialmente ritirato come Core Web Vital a favore di INP nel 2024, quindi si traccia INP e non FID.

Componenti shadcn: `Card` per i Vitals, `ChartContainer` + `LineChart` per i trend, `ChartContainer` + `BarChart` per worst page e device, `Table` per le pagine, `Dialog` o `Sheet` per il dettaglio, `Badge` per il quality level.

## Errors

### Scopo

Errors è una inbox operativa di impatto, non una lista di messaggi tecnici.

Domande a cui risponde:

- Quali errori stanno bloccando utenti o editor?
- Quali errori sono nuovi?
- Quali sono regressioni?
- Quali aree sono più fragili?
- Quante sessioni sono state impattate?
- L'errore è frequente o grave?
- È stato risolto, ignorato o è ancora aperto?

### Limite del modello solo fingerprint/count

Il modello attuale raggruppa per fingerprint e incrementa `count`. È utile, ma `count` da solo inganna: 200 occorrenze su una pagina marginale possono essere meno urgenti di 3 occorrenze che bloccano il login, un errore che torna dopo essere stato risolto è una regressione, e un errore client su mobile resta invisibile se non segmentato.

### Fingerprint: algoritmo

Tutta la regression detection si appoggia alla stabilità del fingerprint, quindi va specificato, non lasciato a "fingerprint stabile e redatto". Il rischio doppio: un fingerprint troppo fine fa apparire una vera regressione come errore nuovo dopo un refactor; uno troppo grossolano fa collidere errori diversi.

Normalizzazione prima dell'hash:

- Firma = tipo/classe errore + primi N frame applicativi dello stack.
- Ogni frame ridotto a (nome funzione + modulo/path relativo), senza numeri di riga e colonna.
- Frame minificati mappati attraverso le source map prima dell'hash.
- Rimozione dei segmenti dinamici: numeri, UUID, hex, query string, dati utente.
- Path assoluti ridotti a path di modulo relativi.
- `N` fissato esplicitamente (default: primi 5 frame applicativi, esclusi frame `node_modules`/vendor) per bilanciare over-grouping e over-splitting.
- Per errori HTTP/network: (method + route template, non path concreto + classe di status).

Versionamento e regressioni:

- Si salva `fingerprintVersion`. Un cambio dell'algoritmo è una migrazione, non un cambio silenzioso che fonde o spezza la storia.
- Poiché i refactor cambiano i frame, la regression detection sul solo fingerprint ha falsi negativi. Si usa quindi anche una chiave più grossolana, `errorSignature` (tipo + template messaggio + impactArea), come secondo livello: se una signature grossolana ricompare dopo essere stata risolta, si segnala possibile regressione anche quando il fingerprint fine è diverso.

### Dati da raccogliere

Separare gruppo e occorrenze.

```ts
ErrorGroup {
  id                    // catturato
  fingerprint           // derivato (normalizzazione)
  fingerprintVersion    // catturato
  errorSignature        // derivato (chiave grossolana per regressioni)
  title                 // derivato
  source                // catturato: "server"|"client"|"boundary"
  severity              // derivato (impatto e contesto)
  status                // operativo: "open"|"investigating"|"resolved"|"ignored"
  firstSeenAt           // catturato (server)
  lastSeenAt            // catturato (server)
  occurrenceCount       // derivato (pesato per sampleRate se campionato)
  affectedSessions      // derivato
  affectedPaths         // derivato
  impactArea            // derivato: "cms"|"public_site"|"auth"|"media"|"editorial"|"unknown"
  userImpact            // derivato: "none"|"minor"|"blocked_action"|"lost_content"
  regression            // derivato
  firstRelease          // catturato
  lastRelease           // catturato
  resolvedAt            // operativo
  resolvedBy            // operativo
}
```

```ts
ErrorOccurrence {
  id                    // catturato
  errorGroupId          // derivato (matching fingerprint)
  sessionId             // catturato
  requestId             // catturato
  correlationId         // catturato
  path                  // catturato
  routePath             // catturato (template)
  routeType             // catturato
  method                // catturato
  statusCode            // catturato
  actionContext         // catturato
  userAgent             // catturato
  deviceType            // derivato
  browser               // derivato
  os                    // derivato
  stackTraceRedacted    // catturato (redatto)
  metadata              // catturato (limitato)
  occurredAt            // catturato (server)
}
```

### Regole qualitative

La severità deriva da impatto e contesto, non solo da frequenza:

- `critical`: login rotto, publish rotto, data loss, upload bloccato, errore su molte sessioni.
- `high`: errore su contenuti pubblici importanti, flusso critico, regression confermata.
- `medium`: errore visibile ma aggirabile.
- `low`: errore raro, non bloccante, senza impatto utente chiaro.

`status` è gestito operativamente: `open` (nuovo o non valutato), `investigating` (qualcuno lo segue), `resolved` (fix applicato o chiuso), `ignored` (rumore noto). Una regressione si verifica quando un errore `resolved` ricompare dopo una nuova release o un intervallo rilevante, secondo il doppio livello fingerprint/signature.

### Metriche CMS primarie

Errori aperti per severità, critical/high, nuovi nelle ultime 24h/7d, regressioni, sessioni impattate, azioni CMS bloccate, aree più fragili, risolti vs aperti.

### UI consigliata

La pagina `Errors` è una inbox Sentry-light coerente col CMS.

Sezioni: header operativo (open, critical, new, regressions); tabs Aperti/Investigating/Risolti/Ignorati; lista ordinata per impatto qualitativo; filtri per source, severity, status, impact area, path, release, date range; dettaglio con timeline occorrenze, contesto request, stack redatto, metadata; azioni per assegnare status, marcare risolto, ignorare, copiare fingerprint/requestId.

Componenti shadcn: `Tabs` per lo status, `Card` per i KPI, `Table` o list per l'inbox, `Badge` per severity/status/source, `Sheet` per il dettaglio, `Dialog` per le azioni distruttive, `ChartContainer` + `BarChart` per gli errori per area, `ChartContainer` + `LineChart` per le occorrenze nel tempo.

## Audit

### Scopo

Audit spiega cosa è stato cambiato, da chi, con quale rischio e con quale impatto pubblico. Non è solo una cronologia tecnica, è uno strumento di responsabilità, compliance e controllo editoriale.

Domande a cui risponde:

- Chi ha cambiato cosa?
- Quale campo è cambiato?
- L'azione ha impatto pubblico?
- Quanto è sensibile questa azione?
- L'azione è riuscita o fallita?
- Il fallimento riguarda un'azione critica?
- Ci sono sequenze sospette o rischiose?
- Si può ricostruire una pubblicazione o cancellazione?

### Limite del modello attuale

Il modello attuale registra actor, action, resource, outcome, request e metadata. È una buona base ma manca interpretazione qualitativa: cambiare il titolo di una bozza è diverso da pubblicare, cambiare ruolo a un utente è diverso da aggiornare un tag, cancellare un media usato pubblicamente è ad alto rischio, e un fallimento su publish pesa più di un fallimento su update minore.

### Azioni riuscite e azioni fallite

Distinzione che la prima stesura non aveva. `beforeSummary`/`afterSummary` e `AuditChange` presuppongono una mutazione riuscita. Un publish fallito non ha un diff applicato, e proprio quello è il valore forense da non perdere.

Regola:

- Per `outcome = SUCCESS` con mutazione persistita: si registrano `beforeSummary`, `afterSummary` e le righe `AuditChange` con i valori effettivamente applicati.
- Per `outcome = FAILURE`: non esiste un applied change. Si registra `attemptedSummary`, cioè il payload inteso confrontato con lo stato corrente, marcato esplicitamente come tentato e non applicato. Nessuna riga `AuditChange` dichiara un cambiamento avvenuto.
- Il rischio di un fallimento è il rischio dell'azione tentata: un publish fallito resta `high` anche senza scrittura sul database.

### Dati da raccogliere

```ts
AuditActivity {
  id                    // catturato
  actorId               // catturato
  actorSnapshot         // catturato
  action                // catturato
  resourceType          // catturato
  resourceId            // catturato
  resourceSnapshot      // catturato
  outcome               // catturato: "SUCCESS"|"FAILURE"
  riskLevel             // derivato (action/resource/outcome)
  changedFields         // derivato (solo SUCCESS)
  beforeSummary         // catturato (solo SUCCESS)
  afterSummary          // catturato (solo SUCCESS)
  attemptedSummary      // catturato (solo FAILURE)
  publicImpact          // derivato
  requestId             // catturato
  correlationId         // catturato
  reason                // catturato
  errorCode             // catturato (su FAILURE)
  errorMessage          // catturato (redatto, su FAILURE)
  metadata              // catturato
  createdAt             // catturato (server)
}
```

Per cambiamenti complessi (solo su SUCCESS):

```ts
AuditChange {
  auditActivityId       // catturato
  field                 // catturato
  beforeValueRedacted   // catturato (redatto)
  afterValueRedacted    // catturato (redatto)
  changeType            // catturato: "created"|"updated"|"removed"|"reordered"
}
```

### Regole qualitative

Risk level:

- `low`: modifica bozza, update metadati non pubblici, reorder non pubblico.
- `medium`: modifica contenuto pubblicato non critica, aggiornamento navigazione minore.
- `high`: publish/unpublish, delete, modifica media usato, modifica contenuto in evidenza.
- `critical`: cambio ruolo utente, cancellazione utente/admin, azione massiva distruttiva, security-sensitive.

Public impact: `true` se l'azione cambia contenuti pubblici, navigazione pubblica, media pubblici o dati visibili; `false` se resta confinata al CMS o a bozze. Il fallimento su azione high/critical resta high/critical anche senza mutazione persistita.

### Metriche CMS primarie

Azioni high/critical recenti, fallimenti su azioni sensibili, modifiche con impatto pubblico, attività per attore, risorse più modificate, sequenze sospette (molti delete, molti failure, cambio ruolo seguito da delete), timeline pubblicazioni/cancellazioni.

### UI consigliata

La pagina `Audit` è una timeline di responsabilità.

Sezioni: KPI (high risk, public impact, failures, active actors); timeline attività con badge risk/outcome/public impact; filtri per actor, resource, action, risk, outcome, public impact, date range; dettaglio con evento, attore, risorsa, diff, request, errore, metadata; diff leggibile per i campi modificati (e per i fallimenti, il tentativo marcato come tale); link alla risorsa se esiste ancora; copy button per auditId, requestId, resourceId.

Componenti shadcn: `Card` per i KPI, `Table` per la vista compatta, `Tabs` per Tutti/High risk/Falliti/Impatto pubblico, `Sheet` per i filtri, `Dialog` o `Sheet` per il dettaglio, `Badge` per risk/outcome/public impact, `Command` per cercare actor/resource.

## Alerting e SLO

Il sistema è retrospettivo per disegno, ma alcuni segnali vanno spinti, non aspettati in dashboard. "Un errore upload ha bloccato 3 editor" lo vuoi sapere ora, non domani.

**Livello minimo di alerting.** Notifiche su soglia, via canale esistente (email, Slack o webhook), per: nuovi `ErrorGroup` critical; errori su azioni critiche (publish, upload, login, salvataggio editoriale); regressioni confermate; spike improvvisi di occorrenze su un gruppo; opzionalmente regression di performance dopo una release. Le notifiche devono essere deduplicate per gruppo, con cooldown, per non diventare rumore.

**SLO opzionali.** Obiettivi su poche metriche che contano davvero, ad esempio publish success rate, e LCP p75 sui template chiave. Con un burn alert quando l'obiettivo viene eroso. È una decisione di prodotto, non un obbligo tecnico, ma il livello minimo di push sugli errori critici è raccomandato fin da subito.

## Overview Osservabilità

Oltre alle quattro pagine, serve una vista complessiva che risponde a una domanda: "Il sistema è sano e i contenuti stanno funzionando?".

Sezioni consigliate: quality score globale; letture qualificate e completate; errori bloccanti aperti; pagine con esperienza frustrante; azioni CMS high risk recenti; regressioni tecniche; contenuti con alto interesse ma performance scarsa.

Esempi di insight utili: "questo articolo ha poche views ma completion rate molto alto"; "la pagina ascolta genera molti start ma pochi completamenti"; "gli utenti mobile abbandonano la home quando LCP è poor"; "un errore media upload ha bloccato 3 editor"; "un articolo pubblicato ieri continua a ricevere letture in giorni diversi".

## Stima dei Volumi

Senza un ordine di grandezza non si decide se la tabella raw regge, e il volume nasce soprattutto dagli eventi ad alta frequenza.

Conto per sessione (prima del campionamento): `session_start` + `session_end` + N `heartbeat` (un articolo letto a fondo può produrne 10-20) + alcune `scroll_milestone` + `page_enter`/`page_exit` per pagina. Una sessione engaged può quindi generare facilmente 20-40 eventi raw.

Formula per dimensionare:

```text
eventi/giorno ≈ sessioni/giorno × eventi/sessione × (frazione non campionata)
crescita raw/giorno ≈ eventi/giorno × dimensione media riga
```

Implicazioni di disegno, indipendenti dai numeri esatti:

- Partizionare gli eventi raw per data.
- Batchare i beacon lato client (`sendBeacon`, coalescing al page-hide) invece di una richiesta per evento.
- Retention breve sui raw, lunga sugli aggregati: le dashboard storiche non devono dipendere dai raw.
- Campionare heartbeat e scroll milestone, mai errori e audit, con aggregati sample-rate-aware.

I numeri reali vanno inseriti quando c'è traffico vero. Finché è una stima, il sistema è progettato per non rompersi su un ordine di grandezza ragionevole.

## Fasi Di Sviluppo Pianificate

Il progetto è in sviluppo e non deployato. Questo permette di riscrivere la struttura dati senza preservare compatibilità con dati storici o codice provvisorio. La regola è esplicita: ciò che è stato fatto finora si può buttare via e rifare da zero se non serve il modello qualitativo. Non si progetta retrocompatibilità, non si mantengono vecchi endpoint o vecchie tabelle per inerzia, non si protegge il concetto di page view come metrica primaria. Questo non giustifica un unico refactor enorme né il modellare tutto prima di vedere un dato reale: ogni fase deve comunque lasciare il sistema funzionante, verificabile e leggibile.

### Fase 0: Allineamento Del Modello E Definizioni Fondanti

Obiettivo: fissare vocabolario, algoritmi e contratti prima di toccare schema e UI. La Fase 0 non deve adattarsi al codice esistente: il codice esistente è sacrificabile. Se `AnalyticsEvent`, `WebVital`, `ErrorLog`, `TelemetryDailyAggregate`, endpoint, DTO o componenti attuali sono incoerenti con il modello qualitativo, si eliminano o si riscrivono nelle fasi successive senza layer legacy.

Principio di questa fase: contract-first, no retrocompatibilità. Prima si decide cosa significa ogni numero, poi si costruiscono schema, collector, aggregati e UI. Nessuna metrica qualitativa può entrare nello schema se non ha una definizione riproducibile e testabile.

Checklist operativa Fase 0:

- [x] Dichiarare esplicitamente che il modello esistente di telemetry/performance/errors/audit è provvisorio e non vincolante.
- [x] Decidere quali parti concettuali già presenti si possono riusare come idea, non come vincolo: hash giornaliero, normalizzazione path/referrer, limiti metadata, skip path tecnici.
- [x] Decidere quali parti vanno sostituite senza retrocompatibilità: page-view analytics come metrica primaria, `FID`, grouped error senza occorrenze, aggregati basati su views, fingerprint non versionato.
- [x] Definire i valori canonici di `pageType`: home, article, issue, static_page, listen, media, cms.
- [x] Definire i valori canonici di `contentType`: article, issue, page, media, navigation, user, taxonomy.
- [x] Definire i livelli qualitativi: `glance`, `scan`, `engaged`, `completed`.
- [x] Definire la performance percepita: `smooth`, `acceptable`, `frustrating`, `broken`.
- [x] Definire severity errori: `low`, `medium`, `high`, `critical`.
- [x] Definire status errori: `open`, `investigating`, `resolved`, `ignored`.
- [x] Definire risk audit: `low`, `medium`, `high`, `critical`.
- [x] Definire outcome audit: `SUCCESS`, `FAILURE`.
- [x] Definire quando un evento o un'attività ha `publicImpact`.
- [x] Definire `view`, `visit`, `session`, `read`, `qualifiedVisit`, `completedRead`, `return`, `completion`, `impact`, `activeTime`, `qualityScore`.
- [x] Confermare la soglia di nuova sessione: 30 minuti di inattività.
- [x] Scrivere l'algoritmo del tempo attivo: heartbeat 15s, idle threshold 30s, cap del delta 20s, visibility/focus/interazione, monotonic clock.
- [x] Definire i casi limite del tempo attivo: tab in background, finestra senza focus, gap heartbeat, page exit, idle lungo, clock manipolato.
- [x] Scrivere la formula del quality score di sessione con base, bonus, penalità, clamp e breakdown.
- [x] Scrivere la formula del quality score di contenuto con componenti, pesi iniziali, normalizzazione, penalità e breakdown.
- [x] Decidere come versionare pesi e soglie del quality score.
- [x] Scrivere l'algoritmo di fingerprint errori con normalizzazione, stack frame applicativi, rimozione dati dinamici, route template, `fingerprintVersion`.
- [x] Definire `errorSignature` come chiave grossolana per regressioni oltre al fingerprint fine.
- [x] Definire l'identità del visitatore: `sessionId` in `sessionStorage`, `visitorHash` server-side giornaliero, niente tracking cross-day per persona.
- [x] Definire come rappresentare ritorni same-session, same-day e interesse ricorrente multi-giorno solo aggregato.
- [x] Definire l'autorità dei timestamp: `receivedAtServer` autorevole, `clientSequence` e `clientElapsedMs` non autorevoli.
- [x] Definire stance privacy/GDPR: minimizzazione, niente token/body/header sensibili, consenso opzionale, DNT e Global Privacy Control.
- [x] Definire cosa si campiona: heartbeat e scroll milestone sì; errori, audit, session_start, session_end no.
- [x] Definire regole sample-rate-aware: conteggi pesati, medie/percentili non calcolati come media ingenua dei campioni.
- [x] Definire bot filtering minimo: user-agent denylist, assenza segnali umani, timing assurdo, headless marker, skew client/server.
- [x] Definire limiti metadata: shape ammessa, dimensione massima, cardinalità, redazione valori sensibili.
- [x] Definire parametri iniziali configurabili: idle threshold, heartbeat interval, max heartbeat gap, pesi score, soglie engagement per `pageType`.
- [x] Definire quali raw event sono ammessi nella prima versione e quali sono esplicitamente fuori scope.
- [x] Definire quali campi sono catturati e quali sono derivati, vietando campi interpretati autorevoli sulle tabelle raw.
- [x] Definire criteri di accettazione per Fase 1 e Fase 2 basati su questi contratti, non sul codice attuale.
- [x] Preparare test unitari per vocabolari, active time, quality score, fingerprint, visitor hash, timestamp sanity, metadata privacy e sample-rate weighting.
- [x] Aggiornare il documento dopo ogni decisione, evitando documenti paralleli o checklist separate.

Deliverable prodotti:

- Contratti puri in `lib/server/modules/observability/model/*`.
- Test unitari in `tests/unit/lib/server/modules/observability/model.test.ts`.
- Verifica: `pnpm test:run tests/unit/lib/server/modules/observability/model.test.ts` e `pnpm typecheck`.

Criterio di completamento:

- [x] Ogni metrica qualitativa ha una definizione riproducibile, non una descrizione.
- [x] Nessun termine ambiguo resta non definito: view, visit, session, read, return, completion, impact, active time, quality score.
- [x] Il codice provvisorio non impone vincoli di retrocompatibilità alle fasi successive.
- [x] Le parti incompatibili col modello qualitativo sono identificate come eliminabili o riscrivibili.
- [x] Le fasi successive possono partire senza reinterpretare vocabolario, privacy, timestamp, fingerprint, active time o score.

### Fase 1: Slice Verticale Dello Schema

Obiettivo: validare l'architettura end-to-end su pochi modelli prima di committare l'intero schema. La libertà del "non ancora deployato" si usa per andare per gradi, non per modellare nove entità al buio.

Assunzione operativa: la Fase 0 è stata completata come descritta. Vocabolario, algoritmi, fingerprint, privacy, timestamp, score, metadata, sample rate e campi catturati/derivati non si ridefiniscono qui. La Fase 1 li applica.

Principio di questa fase: slice verticale, no retrocompatibilità. Le tabelle e i flussi provvisori (`AnalyticsEvent`, `WebVital`, `ErrorLog`, `TelemetryDailyAggregate`, `WebVitalDailyAggregate`, DTO basati su views, procedure CMS basate su page view, job di aggregazione provvisori) non sono vincoli. Se non servono lo slice qualitativo, si eliminano o si riscrivono. Non si mantengono adapter legacy, alias di endpoint, mapping vecchio-nuovo o doppie dashboard per proteggere il modello provvisorio.

Scelta dello slice interpretato: `ErrorGroup` + `ErrorOccurrence`. Gli errori danno valore operativo immediato e validano correlazione, fingerprint versionato, status operativo, severità derivata, dettaglio UI e separazione tra gruppo interpretato e occorrenze catturate. `ContentEngagement` resta fuori da questa fase e viene affrontato in Fase 3.

Modelli introdotti in questa fase, soltanto la spina dorsale:

- `ObservabilitySession`
- `ObservabilityEvent` raw append-only
- `ErrorGroup`
- `ErrorOccurrence`

Campi trasversali da prevedere fin da subito: `sessionId`, `visitorHash`, `requestId`, `correlationId`, `path`, `pageType`, `contentId`, `contentType`, `release`/`buildId`, `sampleRate`, `clientSequence`, `clientElapsedMs`, `receivedAtServer`, `metadata` con limiti severi di dimensione e shape.

Decisioni tecniche: `ObservabilityEvent` append-only; retention raw più breve degli aggregati; tabelle interpretate leggibili direttamente dalla UI; campi interpretati mai scritti come fatti certi sui record di cattura; ogni occorrenza errore viene salvata, mentre il gruppo contiene solo stato, sintesi e contatori derivati; la sessione in Fase 1 è minima e serve a collegare l'errore al percorso end-to-end, non sostituisce il session tracking completo della Fase 2.

Checklist operativa Fase 1:

- [ ] Rimuovere dallo schema autorevole i modelli provvisori incompatibili: `AnalyticsEvent`, `WebVital`, `ErrorLog`, `TelemetryDailyAggregate`, `WebVitalDailyAggregate`.
- [ ] Rimuovere o riscrivere le relazioni implicite del codice verso page view, Web Vitals aggregate e `ErrorLog.count` come fonti primarie della UI.
- [ ] Creare `ObservabilitySession` con campi minimi catturati/derivati: `id`, `visitorHash`, `startedAt`, `lastSeenAt`, `endedAt`, `landingPath`, `exitPath`, `referrerDomain`, `country`, `userAgent` redatto o limitato, `isLikelyBot`, `createdAt`, `updatedAt`.
- [ ] Creare `ObservabilityEvent` raw append-only con `sessionId`, `visitorHash`, `type`, `category`, `path`, `pageType`, `contentId`, `contentType`, `requestId`, `correlationId`, `release`/`buildId`, `sampleRate`, `clientSequence`, `clientElapsedMs`, `metadata`, `receivedAtServer`.
- [ ] Creare `ErrorGroup` con `fingerprint`, `fingerprintVersion`, `errorSignature`, `title`, `source`, `severity`, `status`, `firstSeenAt`, `lastSeenAt`, `occurrenceCount`, `affectedSessions`, `affectedPaths`, `impactArea`, `userImpact`, `regression`, `firstRelease`, `lastRelease`, `resolvedAt`, `resolvedBy`.
- [ ] Creare `ErrorOccurrence` con `errorGroupId`, `observabilityEventId`, `sessionId`, `requestId`, `correlationId`, `path`, `routePath`, `routeType`, `method`, `statusCode`, `actionContext`, `userAgent` redatto o limitato, `deviceType`, `browser`, `os`, `stackTraceRedacted`, `metadata`, `occurredAt`.
- [ ] Decidere esplicitamente quali campi sono nullable in Fase 1 perché non ancora prodotti dal collector completo, senza inventare valori falsi: ad esempio `sessionId` può mancare per errori server non correlati a una sessione browser.
- [ ] Aggiungere indici minimi per lo slice: sessione per `visitorHash`/`startedAt`, eventi per `receivedAtServer`/`sessionId`/`requestId`, gruppi per `fingerprint`/`errorSignature`/`status`/`severity`/`lastSeenAt`, occorrenze per `errorGroupId`/`occurredAt`/`sessionId`/`requestId`.
- [ ] Generare una migrazione Prisma netta che elimina le tabelle provvisorie e crea le nuove tabelle, senza colonne ponte, backfill legacy o preservazione dei conteggi vecchi.
- [ ] Aggiornare il client telemetry minimo per generare `sessionId` anonimo in `sessionStorage`, ruotarlo dopo 30 minuti di inattività e allegarlo agli errori client.
- [ ] Non implementare in Fase 1 heartbeat, scroll milestone, active time completo, bot filtering completo o batching avanzato: appartengono alla Fase 2 o 3.
- [ ] Aggiornare `/api/telemetry` per accettare il payload minimo dello slice, validarlo con Zod, applicare limiti di payload e ignorare input invalidi senza rompere la risposta.
- [ ] Limitare il collector pubblico di Fase 1 agli errori client e agli eventi raw necessari per ricostruirli; analytics/page view e Web Vitals non devono restare la fonte primaria di nessuna pagina nuova.
- [ ] Aggiornare `instrumentation.ts` o il punto equivalente di cattura server error per registrare errori server nel nuovo flusso `ErrorGroup` + `ErrorOccurrence`.
- [ ] Implementare sanitizzazione e redazione centralizzate per metadata, path, user-agent, stack trace e messaggi errore secondo i limiti decisi in Fase 0.
- [ ] Implementare `fingerprintVersion` obbligatorio e algoritmo fingerprint v1 conforme alla Fase 0, senza riusare il fingerprint provvisorio non versionato come vincolo.
- [ ] Implementare `errorSignature` grossolana per regressioni future, anche se la detection completa può restare minima in questa fase.
- [ ] Implementare derivazione iniziale deterministica di `title`, `severity`, `impactArea` e `userImpact` da source, route, status code, action context e contesto disponibile.
- [ ] Implementare il flusso service atomico: calcolo fingerprint/signature, creazione o aggiornamento `ObservabilitySession`, creazione `ObservabilityEvent`, creazione o aggiornamento `ErrorGroup`, creazione sempre nuova `ErrorOccurrence`, aggiornamento sintesi del gruppo.
- [ ] Garantire che un errore ripetuto incrementi e aggiorni il gruppo ma produca comunque una nuova occorrenza consultabile.
- [ ] Separare responsabilità nel modulo server: schema Zod per input/output, repository per Prisma, service per regole/fingerprint/derivazioni, DTO per UI, policy per accesso CMS.
- [ ] Evitare router tRPC con business logic: le procedure devono orchestrare input, policy, service e `parseOutput`.
- [ ] Creare DTO CMS per lista gruppi errore con almeno `id`, `title`, `source`, `severity`, `status`, `occurrenceCount`, `affectedSessions`, `affectedPaths`, `impactArea`, `userImpact`, `firstSeenAt`, `lastSeenAt`, `regression`.
- [ ] Creare DTO CMS per dettaglio gruppo con fingerprint, versione, signature, stato operativo, breakdown impatto, ultime occorrenze, request/session/correlation id, path, route, stack redatto e metadata redatti.
- [ ] Creare procedure tRPC per lista errori, dettaglio errore e aggiornamento status (`open`, `investigating`, `resolved`, `ignored`).
- [ ] Aggiornare o sostituire la UI CMS errori in modo che legga `ErrorGroup` e `ErrorOccurrence`, non `ErrorLog` o conteggi legacy.
- [ ] La prima UI deve mostrare una inbox operativa minima: KPI essenziali, lista ordinata per impatto/recenza, filtri per status/severity/source, dettaglio con timeline occorrenze e copy button per fingerprint/requestId/sessionId.
- [ ] Rimuovere o disabilitare route, schermate, prefetch e query CMS che dipendono da analytics summary o performance summary provvisori se non sono più coerenti con lo slice.
- [ ] Rimuovere o rendere esplicitamente non applicabili gli script provvisori di aggregazione/prune telemetry che dipendono dalle vecchie tabelle, se non vengono riscritti per il nuovo schema.
- [ ] Aggiornare export e import del modulo in modo che il codice non continui a esporre DTO o schema legacy come API ufficiale.
- [ ] Aggiornare i test esistenti che presuppongono `page_view`, `FID`, `ErrorLog` o aggregate a views, eliminando le aspettative incoerenti invece di adattarle con compatibilità finta.
- [ ] Aggiungere test unitari per visitor hash giornaliero, normalizzazione path, metadata privacy, fingerprint v1, `errorSignature`, derivazione severity/impact, creazione gruppo, creazione occorrenza e ripetizione errore.
- [ ] Aggiungere test route collector per payload valido, payload invalido, payload oversized, metadata troppo grandi, session id presente, session id assente dove consentito.
- [ ] Aggiungere test tRPC/service per lista, dettaglio e update status con output validato da DTO.
- [ ] Verificare con `prisma validate`, generazione client, typecheck, lint e unit test pertinenti.
- [ ] Aggiornare questo documento se durante l'implementazione emergono decisioni di schema o derivazione che precisano la Fase 1, senza creare checklist parallele.

Deliverable Fase 1:

- [ ] Migrazione Prisma netta con `ObservabilitySession`, `ObservabilityEvent`, `ErrorGroup`, `ErrorOccurrence` e rimozione delle tabelle provvisorie non più usate.
- [ ] Schema Zod input/output per collector minimo, query CMS e update status.
- [ ] Repository per sessioni, raw event, error group e error occurrence.
- [ ] Service per registrazione errori, fingerprint v1, signature, derivazioni qualitative e DTO.
- [ ] Procedure tRPC per inbox errori, dettaglio e cambio status.
- [ ] UI CMS minima per error inbox basata sul nuovo modello interpretato.
- [ ] Test unitari e route test che dimostrano il percorso end-to-end.

Criterio di completamento:

- [ ] Un errore client reale attraversa tutto il percorso: payload collector → sessione minima → evento raw → `ErrorGroup`/`ErrorOccurrence` → DTO → UI.
- [ ] Un errore server reale attraversa il percorso nuovo almeno da cattura server → evento raw o occurrence correlata → `ErrorGroup`/`ErrorOccurrence` → DTO → UI, anche quando `sessionId` non è disponibile.
- [ ] Ogni ripetizione dello stesso errore crea una nuova `ErrorOccurrence` e aggiorna il relativo `ErrorGroup` senza perdere dettaglio operativo.
- [ ] Il fingerprint è normalizzato, versionato e non dipende da dati dinamici o sensibili.
- [ ] La UI errori non usa `ErrorLog`, `AnalyticsEvent`, page view, Web Vitals o aggregati legacy come fonte autorevole.
- [ ] Le parti incompatibili del modello provvisorio sono eliminate o rese non raggiungibili, non mantenute per retrocompatibilità preventiva.
- [ ] Il sistema resta funzionante e verificabile dopo la migrazione, anche se telemetry editoriale, performance qualitativa, aggregati e overview arrivano nelle fasi successive.
- [ ] Solo dopo questa validazione si espande lo schema alle altre entità, fase per fase.

### Fase 2: Collector, Session Tracking, Bot Filtering E Rate Limit

Obiettivo: trasformare `/api/telemetry` da collector di eventi isolati a collector di sessioni e segnali qualitativi, già protetto da bot e rate limit. Bot filtering e rate limit sono qui, non in Fase 10, perché contaminano tutto ciò che viene costruito dopo.

Assunzione operativa: la Fase 1 è stata completata come descritta. Lo schema autorevole contiene già `ObservabilitySession`, `ObservabilityEvent`, `ErrorGroup` ed `ErrorOccurrence`; il vecchio modello basato su `AnalyticsEvent`, `WebVital`, `ErrorLog`, `TelemetryDailyAggregate` e `WebVitalDailyAggregate` è stato rimosso o reso non raggiungibile. La Fase 2 non deve ripristinare nessun contratto legacy.

Principio di questa fase: collector-first, no retrocompatibilità. Il client `page_view`, i payload `analytics`, i payload `web-vital`, il supporto a `FID`, i collector a evento singolo e i componenti pubblici che producono views grezze non sono compatibili col modello qualitativo. Si eliminano o si riscrivono. Non si mantengono endpoint alias, mapping legacy, fallback a vecchie metriche o test che proteggono il comportamento provvisorio.

Checklist operativa Fase 2:

- [ ] Rimuovere dal contratto pubblico del collector ogni payload legacy rimasto dopo Fase 1: `analytics`, `web-vital`, `client-error` standalone se non conforme al nuovo flusso, `page_view`, `article_view`, `issue_view`, `listen_view`, `media_open`, `FID` e ogni evento che rappresenta una view come metrica primaria.
- [ ] Rimuovere o sostituire il client telemetry legacy che espone API tipo `track` e `reportWebVital`, se ancora presenti, invece di adattarle al nuovo modello con wrapper compatibili.
- [ ] Rimuovere o sostituire i componenti pubblici che inviano page view o Web Vitals standalone, montando un solo tracker pubblico di sessione.
- [ ] Definire il payload batch unico di `/api/telemetry` per Fase 2: `sessionId`, `pageInstanceId`, `collectionMode`, lista `events`, e contesto evento con `type`, `path`, `pageType`, `contentId`, `contentType`, `sampleRate`, `clientSequence`, `clientElapsedMs`, `metadata`.
- [ ] Limitare il batch con soglie esplicite: dimensione massima body, numero massimo eventi per richiesta, dimensione massima metadata, numero massimo chiavi metadata, lunghezza massima stringhe e cardinalità accettabile dei campi liberi.
- [ ] Accettare solo raw event ammessi in Fase 2: `session_start`, `session_heartbeat`, `session_end`, `page_enter`, `page_exit`, `visibility_change`, `scroll_milestone` e gli eventi errore già introdotti in Fase 1 se passano dallo stesso collector.
- [ ] Validare il payload collector con Zod usando i vocabolari canonici di Fase 0 e i modelli introdotti in Fase 1, senza ridefinire enum paralleli o valori speciali per compatibilità.
- [ ] Rendere `/api/telemetry` batch-only: payload singoli o legacy vengono ignorati con risposta vuota, non convertiti al nuovo formato.
- [ ] Mantenere la risposta del collector non informativa (`204`) per payload invalidi, oversized, rate limited o non applicabili, evitando di esporre dettagli utili a spammer o bot.
- [ ] Leggere dal request context solo dati ammessi: IP per hashing/rate limit, user-agent limitato, country da header affidabili, requestId/correlationId se disponibili, DNT e Global Privacy Control.
- [ ] Normalizzare path e referrer lato server rimuovendo sempre query string, frammenti, token e valori sensibili, anche se il client li ha già rimossi.
- [ ] Continuare a ignorare la telemetry pubblica per path tecnici e interni: `/cms`, `/api`, `/_next`, asset metadata e route equivalenti definite dal modello.
- [ ] Implementare o aggiornare il client di sessione per generare `sessionId` anonimo in `sessionStorage`, senza cookie e senza identificatore persistente cross-day.
- [ ] Rigenerare il `sessionId` dopo 30 minuti di inattività, usando il timestamp locale solo come stato client per decidere la rotazione, non come fonte autorevole server.
- [ ] Generare un `pageInstanceId` per ogni permanenza su una pagina, così refresh, rientri e navigazioni interne possono essere distinti senza contare view grezze come metrica primaria.
- [ ] Mantenere `clientSequence` monotono per sessione e `clientElapsedMs` basato su `performance.now()`, senza inviare wall-clock client come timestamp autorevole.
- [ ] Inviare `session_start` una volta per nuova sessione e `session_end` best-effort su `pagehide`, chiusura pagina o rotazione sessione.
- [ ] Inviare `page_enter` a ogni ingresso pagina pubblico e `page_exit` su cambio pagina, `pagehide` o uscita, evitando doppioni per lo stesso `pageInstanceId`.
- [ ] Inviare `visibility_change` quando cambia `document.visibilityState`, senza trasformarlo in durata interpretata sul client.
- [ ] Implementare heartbeat ogni 15 secondi solo quando la pagina è attiva secondo la definizione di Fase 0: visibile, finestra a fuoco e interazione umana recente entro 30 secondi.
- [ ] Cappare o scartare lato client i gap palesemente inattivi secondo i parametri di Fase 0, ma salvare comunque abbastanza raw signal perché il server/job possa ricostruire la sequenza.
- [ ] Verificare che una tab in background o una finestra senza focus non produca heartbeat utili e non aumenti artificialmente il tempo attivo.
- [ ] Implementare `scroll_milestone` con soglie deduplicate per pagina, ad esempio 25/50/75/90/100, evitando eventi scroll continui.
- [ ] Applicare campionamento solo a eventi ad alta frequenza (`session_heartbeat`, `scroll_milestone`) e includere sempre il `sampleRate` dell'evento.
- [ ] Non campionare eventi rari o critici: `session_start`, `session_end`, errori, audit e segnali necessari a ricostruire un percorso critico.
- [ ] Implementare batching client: buffer in memoria, flush periodico, flush per soglia di eventi, flush immediato su `pagehide`, `sendBeacon` preferito e fallback `fetch` con `keepalive`.
- [ ] Evitare retry persistenti in storage locale per non introdurre code invasive, duplicati o identificatori non necessari.
- [ ] Implementare deduplicazione lato client per `session_start`, `page_enter`, `page_exit` e milestone scroll già inviate nello stesso `pageInstanceId`.
- [ ] Implementare debounce/throttle per interazioni, scroll e flush, in modo che il collector non riceva spam da eventi browser ad alta frequenza.
- [ ] Leggere il consenso privacy disponibile nel prodotto e combinare consenso, Do Not Track e Global Privacy Control in `collectionMode`.
- [ ] Definire comportamento `collectionMode = "full"`: session tracking, page events, heartbeat e scroll milestone secondo le regole di Fase 2.
- [ ] Definire comportamento `collectionMode = "minimal"`: inviare solo il set minimo ammesso oppure disattivare gli eventi opzionali, senza heartbeat e senza scroll milestone.
- [ ] Non introdurre tracking cross-day, cookie marketing, localStorage persistente per identità visitatore o identificatori per-visitatore senza requisito prodotto esplicito.
- [ ] Derivare `visitorHash` solo lato server da IP, user-agent e salt giornaliero, usando la stessa decisione privacy-first della Fase 0.
- [ ] Aggiornare il service di sessionizzazione per creare o aggiornare `ObservabilitySession` a partire dai batch ricevuti.
- [ ] Aggiornare `ObservabilitySession.startedAt`, `lastSeenAt`, `endedAt`, `landingPath`, `exitPath`, `referrerDomain`, `country`, `userAgent` limitato e `updatedAt` secondo gli eventi ricevuti.
- [ ] Salvare ogni evento valido in `ObservabilityEvent` append-only con `receivedAtServer` autorevole, `sampleRate`, `clientSequence`, `clientElapsedMs`, `requestId`, `correlationId`, `release`/`buildId` quando disponibili.
- [ ] Non scrivere su `ObservabilityEvent` campi interpretati come fatti certi: niente `engagementLevel`, `completed`, `qualityScore`, `exitType`, `perceivedQuality` o valori equivalenti.
- [ ] Valutare la sanità dei timing client con le regole di Fase 0: sequenza negativa o non intera rifiutata, delta negativo o eccessivo marcato come sospetto, non usato come durata autorevole.
- [ ] Implementare rate limit del collector per IP e per `sessionId`, separato dalle policy CMS, con Redis obbligatorio in produzione e fallback locale/test ammesso dove già previsto dal progetto.
- [ ] Assorbire il rate limit del collector con risposta `204` e nessuna scrittura, invece di trasformare il collector pubblico in un endpoint rumoroso o enumerabile.
- [ ] Loggare internamente solo anomalie operative del collector con metadata redatti, senza body request, token, Authorization header, cookie o dati personali non necessari.
- [ ] Implementare bot filtering base nel service usando user-agent denylist/pattern, assenza di segnali umani, marker headless, incongruenze header disponibili e timing client/server sospetto.
- [ ] Salvare le sessioni probabili bot con `isLikelyBot = true` e motivazioni diagnostiche redatte se previste dallo schema, senza cancellarle e senza contaminarle negli aggregati futuri.
- [ ] Non usare il bot filtering per bloccare automaticamente errori o audit critici: il flag serve a escludere gli aggregati qualitativi, non a perdere segnali operativi.
- [ ] Derivare `pageType` in modo conservativo quando il client non lo passa: home, article, issue, static_page, listen, media; lasciare `contentId` nullo se non disponibile senza lookup costosi in Fase 2.
- [ ] Non implementare in Fase 2 `ContentEngagement`, `PerformanceExperience`, quality score, completion, active time aggregato autorevole o dashboard editoriali: appartengono alle fasi successive.
- [ ] Aggiornare export/import del modulo per esporre solo il nuovo collector/session tracker come API ufficiale, rimuovendo DTO e tipi legacy non più usati.
- [ ] Aggiornare i test client che proteggevano `page_view`, `web-vital` e `FID`, eliminando quelle aspettative invece di mantenerle come compatibilità nascosta.
- [ ] Aggiungere test client per creazione sessione, rotazione dopo 30 minuti, `session_start`, `page_enter`, `page_exit`, `session_end`, heartbeat solo attivo, tab background, scroll milestone deduplicate, batching, `sendBeacon`, fallback `fetch keepalive`, path tecnici e privacy minimal.
- [ ] Aggiungere test route collector per batch valido, payload legacy ignorato, payload invalido, payload oversized, troppi eventi, metadata sensibili, metadata troppo grandi, path tecnico, DNT/GPC, rate limit IP e rate limit sessione.
- [ ] Aggiungere test service per creazione sessione, aggiornamento `lastSeenAt`, `landingPath`, `exitPath`, visitor hash giornaliero, salvataggio eventi append-only, normalizzazione path/referrer, timestamp server autorevole e timing client sospetto.
- [ ] Aggiungere test bot filtering per user-agent bot, user-agent mancante, heartbeat senza interazioni, marker headless, skew eccessivo e sessione umana non marcata bot.
- [ ] Verificare con `prisma validate`, generazione client se lo schema cambia, typecheck, lint e unit test pertinenti.
- [ ] Aggiornare questo documento se durante l'implementazione emergono decisioni operative su soglie batch, rate limit, privacy minimal o bot reasons, senza creare checklist parallele.

Deliverable Fase 2:

- [ ] Contratto batch-only di `/api/telemetry` con schema Zod e payload legacy non accettati.
- [ ] Client pubblico di session tracking che sostituisce il tracciamento page-view/Web-Vitals legacy.
- [ ] Service di sessionizzazione che aggiorna `ObservabilitySession` e scrive `ObservabilityEvent` append-only.
- [ ] Rate limiter collector per IP e sessione.
- [ ] Bot detection base con flag `isLikelyBot` sulla sessione.
- [ ] Privacy mode collegato a consenso, DNT e Global Privacy Control.
- [ ] Test unitari e route test sui casi critici della raccolta.

Criterio di completamento:

- [ ] Una visita reale produce `ObservabilitySession` e una sequenza coerente di `ObservabilityEvent`: `session_start`, `page_enter`, heartbeat se attiva, `page_exit`, `session_end` quando possibile.
- [ ] Refresh, ritorni rapidi e navigazioni interne non producono false letture qualificate e non reintroducono page views come metrica primaria.
- [ ] Una tab lasciata aperta in background o senza focus non produce tempo attivo infinito né heartbeat utili.
- [ ] Una sessione bot evidente viene marcata `isLikelyBot = true` e resta disponibile per debug, ma sarà esclusa dagli aggregati qualitativi futuri.
- [ ] Il collector non accetta né conserva contratti legacy come `page_view`, `web-vital`, `FID`, `AnalyticsEvent`, `WebVital` o `ErrorLog`.
- [ ] Privacy, metadata e timestamp rispettano le decisioni della Fase 0: minimizzazione, niente query sensibili, niente clock client autorevole, niente identità cross-day.
- [ ] Il sistema resta funzionante e verificabile dopo la sostituzione del collector, anche se engagement contenuti, performance qualitativa, aggregati e dashboard arrivano nelle fasi successive.

### Fase Calibrazione Iniziale: Soglie Su Dati Reali

Obiettivo: trasformare le soglie da ipotesi a parametri calibrati. Si colloca dopo che il collector produce dati veri (fine Fase 2) e prima di consolidare engagement e score. È una calibrazione iniziale: dopo Fase 3, quando `ContentEngagement` è popolato, va ripetuta con dati editoriali più ricchi.

Lavori principali:

- Raccogliere un campione reale di sessioni e letture.
- Calibrare in modo provvisorio le soglie di `engaged`/`completed` (tempo, scroll) contro un proxy di verità: completamento audio dove esiste, correlazione con ritorni, o etichettatura manuale di un sottoinsieme.
- Calibrare i pesi del quality score osservando se lo score discrimina contenuti che giudichiamo davvero diversi.
- Rendere soglie e pesi configurabili per `pageType`, non costanti globali.

Criterio di completamento: le soglie hanno una giustificazione empirica minima, sono modificabili senza deploy, e il documento/pannello tecnico indica quando è prevista la ricalibrazione dopo Fase 3.

### Fase 3: Engagement Dei Contenuti

Obiettivo: sostituire le views con letture qualificate e consumo reale.

Lavori principali: cablare eventi per articoli, issue, pagine statiche, ascolto e media; associare ogni pagina pubblica a `pageType` e, quando possibile, `contentId`; calcolare `activeTimeMs`, `maxScrollDepth`, `returnCountInSession`, `refreshCount`; derivare `engagementLevel` e `completed` in base al tipo; misurare audio started/completed/listenedMs/completionRate.

Regole specifiche: articolo, completion da scroll, tempo attivo e lunghezza; issue, da interazione coi blocchi e navigazione verso articoli; home, da esplorazione, click verso contenuti, scroll, ritorni; listen, da audio progress, non scroll; media, da apertura, durata, download o interazione.

Deliverable: `ContentEngagement` popolato, service che trasforma eventi raw in engagement, DTO per la dashboard telemetry, test su `glance`/`scan`/`engaged`/`completed`.

Criterio di completamento: la UI mostra letture qualificate senza usare page views come proxy; un contenuto è valutabile per qualità anche con traffico basso.

### Fase 4: Errori Operativi

Obiettivo: trasformare errors da lista aggregata a inbox operativa per impatto.

Lavori principali: consolidare `ErrorGroup` e `ErrorOccurrence`; implementare fingerprint normalizzato con `fingerprintVersion` e chiave grossolana `errorSignature`; salvare occorrenze con request/session/path/route/action context; derivare `severity` iniziale da area, status code, source, userImpact; derivare `impactArea`; status lifecycle; rilevamento regressioni col doppio livello; collegare errori a sessioni impattate e azioni fallite.

Regole qualitative: frequenza alta aumenta priorità ma non determina da sola la severità; errore su login, upload, publish o salvataggio editoriale parte almeno da `high`; errore pubblico non bloccante ma visibile parte da `medium`; errore raro e invisibile resta `low`; regressione aumenta la priorità operativa.

Deliverable: service/repository errors, procedure tRPC per list, detail, update status, UI inbox con tabs, test fingerprint, severity derivata, transizioni di status, regressione.

Criterio di completamento: un admin capisce quali errori risolvere prima senza leggere lo stack; ogni errore importante mostra impatto, area, occorrenze e stato.

### Fase 5: Performance Qualitativa

Obiettivo: trasformare i Web Vitals in esperienza percepita e impatto sulla lettura.

Lavori principali: salvare performance per sessione, path, pageType, contentId, device; normalizzare unità e soglie per LCP, INP, CLS, FCP, TTFB (senza FID); derivare `perceivedQuality` in job; collegare performance poor a bounce o exit precoce; segmentare device/browser/connection; valutare metriche server.

Regole qualitative: poor Web Vital senza impatto comportamentale resta segnale tecnico; con bounce rapido diventa frizione qualitativa; problemi mobile pesano di più se mobile è dominante; campioni piccoli marcati come bassa affidabilità.

Deliverable: `PerformanceExperience` popolato, aggregati per giorno/metrica/pageType/device, UI con Vitals cards, trend e worst pages, test su formattazione soglie, `perceivedQuality`, correlazione bounce.

Criterio di completamento: la pagina dice quali esperienze sono frustranti, non solo quali metriche sono alte; ogni valore tecnico ha unità, soglia e contesto.

### Fase 6: Audit Qualitativo

Obiettivo: trasformare audit da cronologia tecnica a timeline di responsabilità e rischio.

Lavori principali: sostituire o estendere il log con `AuditActivity`; aggiungere `riskLevel`, `publicImpact`, `changedFields`, `beforeSummary`, `afterSummary`, e `attemptedSummary` per i fallimenti; aggiungere `AuditChange` per i diff redatti, solo su SUCCESS; derivare il rischio da action/resource/outcome; registrare le azioni fallite col rischio dell'azione tentata; collegare audit a requestId/correlationId/errori.

Regole qualitative: publish/unpublish/delete almeno `high` se impattano il pubblico; cambio ruolo e azioni admin sensibili `critical`; update bozza e modifiche non pubbliche `low` o `medium`; failure su azione high/critical resta high/critical anche senza mutazione persistita.

Deliverable: middleware audit aggiornato, builder deterministici per risk/publicImpact/change summary, distinzione applied vs attempted, UI timeline con filtri, detail con diff, snapshot risorsa e attore, request context, test su risk derivato, diff redatto, fallback di persistenza.

Criterio di completamento: un admin ricostruisce cosa è cambiato e perché era rischioso, e distingue un'azione riuscita da un tentativo fallito; azioni pubbliche e sensibili emergono senza ricerca manuale.

### Fase 7: Aggregati Qualitativi E Jobs

Obiettivo: dashboard veloci e stabili su aggregati già interpretati.

Lavori principali: job di aggregazione giornaliera; `DailyQualityAggregate` per contenuto, pageType, giorno, con `qualityScoreComponents`; aggregati errori (nuovi, aperti, regressioni, sessioni impattate); aggregati performance (perceived quality, poor rate, worst pages); aggregati audit (high risk, failures, public impact); lock job contro race delete/reinsert; aggregati pesati per `sampleRate` dove c'è campionamento; retention raw breve, aggregati lunga.

Regole operative: aggregati idempotenti; job rilanciabili senza duplicare; tabelle raw non necessarie per dashboard storiche dopo la retention; aggregati con abbastanza dimensioni per filtrare senza riesplodere cardinalità.

Deliverable: script aggregation, script prune, test service-level, documentazione comandi.

Criterio di completamento: le dashboard non dipendono da query pesanti sui raw; la retention non rompe le metriche storiche.

### Fase 8: UI CMS Con Shadcn Charts

Obiettivo: interfaccia coerente col CMS ma più efficace delle tabelle attuali.

Pagine: overview, telemetry, performance, errors inbox, audit timeline.

Componenti condivisi: `ObservabilityMetricCard` su `Card`; `ObservabilityStatusBadge` su `Badge`; `ObservabilityChartCard` con `ChartContainer`; `ObservabilityFilterSheet` con `Sheet`, `Select`, date range; `ObservabilityDetailDrawer`; `CopyTechnicalValueButton`; un componente che mostra la scomposizione del quality score.

Ordine UI: overview con KPI e insight; errors per primo per valore operativo immediato; performance; telemetry quando l'engagement è ben popolato; audit per ultimo perché richiede diff e risk builder affidabili.

Regole visuali: editoriali, severi, leggibili; grafici solo quando chiariscono andamento o distribuzione; niente dashboard decorative; ogni card ha una domanda implicita a cui risponde; ogni tabella ha filtri utili e dettaglio operativo; lo score è sempre accompagnato dalle componenti.

Deliverable: route CMS e loading states, screens client con tRPC prefetch server-side dove utile, grafici coerenti con la palette, stati loading/empty/error/forbidden, responsive desktop/mobile.

Criterio di completamento: un admin capisce lo stato del sistema in meno di 30 secondi; ogni pagina consente lettura rapida e indagine dettagliata.

### Fase 9: Correlazioni E Insight

Obiettivo: trasformare dati separati in insight trasversali.

Insight: contenuti con alto interesse ma performance scarsa; pagine con molte aperture ma poche letture qualificate; errori che causano exit o azioni fallite; audit high risk seguito da errore o regressione; release con peggioramento performance o aumento errori; referrer con traffico basso ma letture complete alte.

Lavori principali: query o aggregati trasversali su sessionId/correlationId/contentId; scoring qualitativo dei contenuti; scoring salute sistema; insight cards in overview; link deep verso contenuto, errore, audit o performance.

Deliverable: service `observabilityOverview`, DTO overview, UI con insight cards, test su scoring e ranking.

Criterio di completamento: la overview non mostra solo metriche, suggerisce cosa guardare prima.

### Fase 10: Hardening, Privacy E Qualità

Obiettivo: rendere il sistema credibile, sicuro e mantenibile. Rispetto alla prima stesura, bot filtering, rate limit e campionamento non sono qui: sono già in Fase 0 e 2, perché incidono sui dati a monte.

Lavori principali: redazione di stack trace, metadata, diff audit; limiti di cardinalità su path/referrer/metadata; export CSV filtrato per audit/errors/telemetry quando utile; test privacy (nessun token, body request, Authorization header o dato personale non necessario; DNT e GPC rispettati); documentazione retention; documentazione interpretazione metriche per admin.

Controlli di qualità: typecheck, lint, unit test service/schema/repository, test route collector, test parser URL UI, test aggregazioni idempotenti, test sample-rate-aware.

Criterio di completamento: il sistema raccoglie dati utili senza diventare invasivo; ogni dato visibile ha una definizione e una ragione operativa.

### Ordine Minimo Consigliato

Se serve ridurre lo scope:

- Fase 0: vocabolario e definizioni fondanti.
- Fase 1: slice verticale dello schema.
- Fase 2: collector, sessioni, bot filtering, rate limit.
- Fase Calibrazione Iniziale: soglie su dati reali.
- Fase 4: errors operativi.
- Fase 5: performance qualitativa.
- Fase 3: engagement contenuti.
- Fase 6: audit qualitativo.
- Fase 7: aggregati.
- Fase 8: UI.
- Fase 9: insight.
- Fase 10: hardening residuo.

La ragione è pratica: errors e performance danno valore operativo prima ancora che l'engagement editoriale sia perfetto. Le definizioni fondanti e il bot filtering stanno all'inizio perché tutto il resto poggia su di essi.

## Decisione Finale

Il sistema non deve diventare una copia di Google Analytics, Sentry o un audit log grezzo. Deve diventare uno strumento interno di qualità editoriale e operativa.

La differenza principale è questa:

```text
Dato quantitativo:
questa pagina ha 1.000 views

Dato qualitativo:
questa pagina ha 180 letture qualificate, 62 completamenti, 21 ritorni significativi,
performance mobile frustrante e nessun errore bloccante
```

Il secondo dato permette di decidere. Il primo quasi mai.

La condizione perché il secondo dato sia credibile è che ogni numero qualitativo abbia una definizione riproducibile dietro: il tempo attivo è un algoritmo, lo score è una formula scomponibile, il fingerprint è normalizzato e versionato, l'identità del visitatore è onesta su cosa può e non può misurare. Senza queste fondamenta il sistema sembra intelligente ma non è affidabile, ed è la differenza tra un numero di cui ti fidi e un numero che subisci.
