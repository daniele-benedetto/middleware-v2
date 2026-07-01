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

- [x] Rimuovere dallo schema autorevole i modelli provvisori incompatibili: `AnalyticsEvent`, `WebVital`, `ErrorLog`, `TelemetryDailyAggregate`, `WebVitalDailyAggregate`.
- [x] Rimuovere o riscrivere le relazioni implicite del codice verso page view, Web Vitals aggregate e `ErrorLog.count` come fonti primarie della UI.
- [x] Creare `ObservabilitySession` con campi minimi catturati/derivati: `id`, `visitorHash`, `startedAt`, `lastSeenAt`, `endedAt`, `landingPath`, `exitPath`, `referrerDomain`, `country`, `userAgent` redatto o limitato, `isLikelyBot`, `createdAt`, `updatedAt`.
- [x] Creare `ObservabilityEvent` raw append-only con `sessionId`, `visitorHash`, `type`, `category`, `path`, `pageType`, `contentId`, `contentType`, `requestId`, `correlationId`, `release`/`buildId`, `sampleRate`, `clientSequence`, `clientElapsedMs`, `metadata`, `receivedAtServer`.
- [x] Creare `ErrorGroup` con `fingerprint`, `fingerprintVersion`, `errorSignature`, `title`, `source`, `severity`, `status`, `firstSeenAt`, `lastSeenAt`, `occurrenceCount`, `affectedSessions`, `affectedPaths`, `impactArea`, `userImpact`, `regression`, `firstRelease`, `lastRelease`, `resolvedAt`, `resolvedBy`.
- [x] Creare `ErrorOccurrence` con `errorGroupId`, `observabilityEventId`, `sessionId`, `requestId`, `correlationId`, `path`, `routePath`, `routeType`, `method`, `statusCode`, `actionContext`, `userAgent` redatto o limitato, `deviceType`, `browser`, `os`, `stackTraceRedacted`, `metadata`, `occurredAt`.
- [x] Decidere esplicitamente quali campi sono nullable in Fase 1 perché non ancora prodotti dal collector completo, senza inventare valori falsi: ad esempio `sessionId` può mancare per errori server non correlati a una sessione browser.
- [x] Aggiungere indici minimi per lo slice: sessione per `visitorHash`/`startedAt`, eventi per `receivedAtServer`/`sessionId`/`requestId`, gruppi per `fingerprint`/`errorSignature`/`status`/`severity`/`lastSeenAt`, occorrenze per `errorGroupId`/`occurredAt`/`sessionId`/`requestId`.
- [x] Generare una migrazione Prisma netta che elimina le tabelle provvisorie e crea le nuove tabelle, senza colonne ponte, backfill legacy o preservazione dei conteggi vecchi.
- [x] Aggiornare il client telemetry minimo per generare `sessionId` anonimo in `sessionStorage`, ruotarlo dopo 30 minuti di inattività e allegarlo agli errori client.
- [x] Non implementare in Fase 1 heartbeat, scroll milestone, active time completo, bot filtering completo o batching avanzato: appartengono alla Fase 2 o 3.
- [x] Aggiornare `/api/telemetry` per accettare il payload minimo dello slice, validarlo con Zod, applicare limiti di payload e ignorare input invalidi senza rompere la risposta.
- [x] Limitare il collector pubblico di Fase 1 agli errori client e agli eventi raw necessari per ricostruirli; analytics/page view e Web Vitals non devono restare la fonte primaria di nessuna pagina nuova.
- [x] Aggiornare `instrumentation.ts` o il punto equivalente di cattura server error per registrare errori server nel nuovo flusso `ErrorGroup` + `ErrorOccurrence`.
- [x] Implementare sanitizzazione e redazione centralizzate per metadata, path, user-agent, stack trace e messaggi errore secondo i limiti decisi in Fase 0.
- [x] Implementare `fingerprintVersion` obbligatorio e algoritmo fingerprint v1 conforme alla Fase 0, senza riusare il fingerprint provvisorio non versionato come vincolo.
- [x] Implementare `errorSignature` grossolana per regressioni future, anche se la detection completa può restare minima in questa fase.
- [x] Implementare derivazione iniziale deterministica di `title`, `severity`, `impactArea` e `userImpact` da source, route, status code, action context e contesto disponibile.
- [x] Implementare il flusso service atomico: calcolo fingerprint/signature, creazione o aggiornamento `ObservabilitySession`, creazione `ObservabilityEvent`, creazione o aggiornamento `ErrorGroup`, creazione sempre nuova `ErrorOccurrence`, aggiornamento sintesi del gruppo.
- [x] Garantire che un errore ripetuto incrementi e aggiorni il gruppo ma produca comunque una nuova occorrenza consultabile.
- [x] Separare responsabilità nel modulo server: schema Zod per input/output, repository per Prisma, service per regole/fingerprint/derivazioni, DTO per UI, policy per accesso CMS.
- [x] Evitare router tRPC con business logic: le procedure devono orchestrare input, policy, service e `parseOutput`.
- [x] Creare DTO CMS per lista gruppi errore con almeno `id`, `title`, `source`, `severity`, `status`, `occurrenceCount`, `affectedSessions`, `affectedPaths`, `impactArea`, `userImpact`, `firstSeenAt`, `lastSeenAt`, `regression`.
- [x] Creare DTO CMS per dettaglio gruppo con fingerprint, versione, signature, stato operativo, breakdown impatto, ultime occorrenze, request/session/correlation id, path, route, stack redatto e metadata redatti.
- [x] Creare procedure tRPC per lista errori, dettaglio errore e aggiornamento status (`open`, `investigating`, `resolved`, `ignored`).
- [x] Aggiornare o sostituire la UI CMS errori in modo che legga `ErrorGroup` e `ErrorOccurrence`, non `ErrorLog` o conteggi legacy.
- [x] La prima UI deve mostrare una inbox operativa minima: KPI essenziali, lista ordinata per impatto/recenza, filtri per status/severity/source, dettaglio con timeline occorrenze e copy button per fingerprint/requestId/sessionId.
- [x] Rimuovere o disabilitare route, schermate, prefetch e query CMS che dipendono da analytics summary o performance summary provvisori se non sono più coerenti con lo slice.
- [x] Rimuovere o rendere esplicitamente non applicabili gli script provvisori di aggregazione/prune telemetry che dipendono dalle vecchie tabelle, se non vengono riscritti per il nuovo schema.
- [x] Aggiornare export e import del modulo in modo che il codice non continui a esporre DTO o schema legacy come API ufficiale.
- [x] Aggiornare i test esistenti che presuppongono `page_view`, `FID`, `ErrorLog` o aggregate a views, eliminando le aspettative incoerenti invece di adattarle con compatibilità finta.
- [x] Aggiungere test unitari per visitor hash giornaliero, normalizzazione path, metadata privacy, fingerprint v1, `errorSignature`, derivazione severity/impact, creazione gruppo, creazione occorrenza e ripetizione errore.
- [x] Aggiungere test route collector per payload valido, payload invalido, payload oversized, metadata troppo grandi, session id presente, session id assente dove consentito.
- [x] Aggiungere test tRPC/service per lista, dettaglio e update status con output validato da DTO.
- [x] Verificare con `prisma validate`, generazione client, typecheck, lint e unit test pertinenti.
- [x] Aggiornare questo documento se durante l'implementazione emergono decisioni di schema o derivazione che precisano la Fase 1, senza creare checklist parallele.

Deliverable Fase 1:

- [x] Migrazione Prisma netta con `ObservabilitySession`, `ObservabilityEvent`, `ErrorGroup`, `ErrorOccurrence` e rimozione delle tabelle provvisorie non più usate.
- [x] Schema Zod input/output per collector minimo, query CMS e update status.
- [x] Repository per sessioni, raw event, error group e error occurrence.
- [x] Service per registrazione errori, fingerprint v1, signature, derivazioni qualitative e DTO.
- [x] Procedure tRPC per inbox errori, dettaglio e cambio status.
- [x] UI CMS minima per error inbox basata sul nuovo modello interpretato.
- [x] Test unitari e route test che dimostrano il percorso end-to-end.

Deliverable prodotti:

- Migration `prisma/migrations/20260701100000_observability_phase_1/migration.sql`.
- Schema Prisma aggiornato in `prisma/schema.prisma` e client generato in `lib/generated/prisma`.
- Modulo server `lib/server/modules/telemetry/*` riscritto su `ObservabilitySession`, `ObservabilityEvent`, `ErrorGroup`, `ErrorOccurrence`.
- Collector `/api/telemetry` limitato al payload minimo `client-error` dello slice.
- Client `lib/telemetry/client.ts` con `sessionId` anonimo in `sessionStorage` e rotazione dopo 30 minuti.
- `instrumentation.ts` collegato al nuovo flusso errori server.
- UI `/cms/errors` basata su inbox errori operativa; `/cms/analytics` e `/cms/performance` rese placeholder espliciti senza query legacy.
- Rimossi componenti page-view/Web-Vitals pubblici e script telemetry legacy.
- Test aggiornati in `tests/unit/lib/server/modules/telemetry/*`, `tests/unit/app/api/telemetry/route.test.ts`, `tests/unit/lib/telemetry/client.test.ts`, `tests/unit/instrumentation.test.ts`.

Criterio di completamento:

- [x] Un errore client reale attraversa tutto il percorso: payload collector → sessione minima → evento raw → `ErrorGroup`/`ErrorOccurrence` → DTO → UI.
- [x] Un errore server reale attraversa il percorso nuovo almeno da cattura server → evento raw o occurrence correlata → `ErrorGroup`/`ErrorOccurrence` → DTO → UI, anche quando `sessionId` non è disponibile.
- [x] Ogni ripetizione dello stesso errore crea una nuova `ErrorOccurrence` e aggiorna il relativo `ErrorGroup` senza perdere dettaglio operativo.
- [x] Il fingerprint è normalizzato, versionato e non dipende da dati dinamici o sensibili.
- [x] La UI errori non usa `ErrorLog`, `AnalyticsEvent`, page view, Web Vitals o aggregati legacy come fonte autorevole.
- [x] Le parti incompatibili del modello provvisorio sono eliminate o rese non raggiungibili, non mantenute per retrocompatibilità preventiva.
- [x] Il sistema resta funzionante e verificabile dopo la migrazione, anche se telemetry editoriale, performance qualitativa, aggregati e overview arrivano nelle fasi successive.
- [x] Solo dopo questa validazione si espande lo schema alle altre entità, fase per fase.

Verifiche eseguite:

- `pnpm prisma:validate`
- `pnpm prisma:generate`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm format:check`
- `pnpm test:run`
- `pnpm build`

### Fase 2: Collector, Session Tracking, Bot Filtering E Rate Limit

Obiettivo: trasformare `/api/telemetry` da collector di eventi isolati a collector di sessioni e segnali qualitativi, già protetto da bot e rate limit. Bot filtering e rate limit sono qui, non in Fase 10, perché contaminano tutto ciò che viene costruito dopo.

Assunzione operativa: la Fase 1 è stata completata come descritta. Lo schema autorevole contiene già `ObservabilitySession`, `ObservabilityEvent`, `ErrorGroup` ed `ErrorOccurrence`; il vecchio modello basato su `AnalyticsEvent`, `WebVital`, `ErrorLog`, `TelemetryDailyAggregate` e `WebVitalDailyAggregate` è stato rimosso o reso non raggiungibile. La Fase 2 non deve ripristinare nessun contratto legacy.

Principio di questa fase: collector-first, no retrocompatibilità. Il client `page_view`, i payload `analytics`, i payload `web-vital`, il supporto a `FID`, i collector a evento singolo e i componenti pubblici che producono views grezze non sono compatibili col modello qualitativo. Si eliminano o si riscrivono. Non si mantengono endpoint alias, mapping legacy, fallback a vecchie metriche o test che proteggono il comportamento provvisorio.

Checklist operativa Fase 2:

- [x] Rimuovere dal contratto pubblico del collector ogni payload legacy rimasto dopo Fase 1: `analytics`, `web-vital`, `client-error` standalone se non conforme al nuovo flusso, `page_view`, `article_view`, `issue_view`, `listen_view`, `media_open`, `FID` e ogni evento che rappresenta una view come metrica primaria.
- [x] Rimuovere o sostituire il client telemetry legacy che espone API tipo `track` e `reportWebVital`, se ancora presenti, invece di adattarle al nuovo modello con wrapper compatibili.
- [x] Rimuovere o sostituire i componenti pubblici che inviano page view o Web Vitals standalone, montando un solo tracker pubblico di sessione.
- [x] Definire il payload batch unico di `/api/telemetry` per Fase 2: `sessionId`, `pageInstanceId`, `collectionMode`, lista `events`, e contesto evento con `type`, `path`, `pageType`, `contentId`, `contentType`, `sampleRate`, `clientSequence`, `clientElapsedMs`, `metadata`.
- [x] Limitare il batch con soglie esplicite: dimensione massima body, numero massimo eventi per richiesta, dimensione massima metadata, numero massimo chiavi metadata, lunghezza massima stringhe e cardinalità accettabile dei campi liberi.
- [x] Accettare solo raw event ammessi in Fase 2: `session_start`, `session_heartbeat`, `session_end`, `page_enter`, `page_exit`, `visibility_change`, `scroll_milestone` e gli eventi errore già introdotti in Fase 1 se passano dallo stesso collector.
- [x] Validare il payload collector con Zod usando i vocabolari canonici di Fase 0 e i modelli introdotti in Fase 1, senza ridefinire enum paralleli o valori speciali per compatibilità.
- [x] Rendere `/api/telemetry` batch-only: payload singoli o legacy vengono ignorati con risposta vuota, non convertiti al nuovo formato.
- [x] Mantenere la risposta del collector non informativa (`204`) per payload invalidi, oversized, rate limited o non applicabili, evitando di esporre dettagli utili a spammer o bot.
- [x] Leggere dal request context solo dati ammessi: IP per hashing/rate limit, user-agent limitato, country da header affidabili, requestId/correlationId se disponibili, DNT e Global Privacy Control.
- [x] Normalizzare path e referrer lato server rimuovendo sempre query string, frammenti, token e valori sensibili, anche se il client li ha già rimossi.
- [x] Continuare a ignorare la telemetry pubblica per path tecnici e interni: `/cms`, `/api`, `/_next`, asset metadata e route equivalenti definite dal modello.
- [x] Implementare o aggiornare il client di sessione per generare `sessionId` anonimo in `sessionStorage`, senza cookie e senza identificatore persistente cross-day.
- [x] Rigenerare il `sessionId` dopo 30 minuti di inattività, usando il timestamp locale solo come stato client per decidere la rotazione, non come fonte autorevole server.
- [x] Generare un `pageInstanceId` per ogni permanenza su una pagina, così refresh, rientri e navigazioni interne possono essere distinti senza contare view grezze come metrica primaria.
- [x] Mantenere `clientSequence` monotono per sessione e `clientElapsedMs` basato su `performance.now()`, senza inviare wall-clock client come timestamp autorevole.
- [x] Inviare `session_start` una volta per nuova sessione e `session_end` best-effort su `pagehide`, chiusura pagina o rotazione sessione.
- [x] Inviare `page_enter` a ogni ingresso pagina pubblico e `page_exit` su cambio pagina, `pagehide` o uscita, evitando doppioni per lo stesso `pageInstanceId`.
- [x] Inviare `visibility_change` quando cambia `document.visibilityState`, senza trasformarlo in durata interpretata sul client.
- [x] Implementare heartbeat ogni 15 secondi solo quando la pagina è attiva secondo la definizione di Fase 0: visibile, finestra a fuoco e interazione umana recente entro 30 secondi.
- [x] Cappare o scartare lato client i gap palesemente inattivi secondo i parametri di Fase 0, ma salvare comunque abbastanza raw signal perché il server/job possa ricostruire la sequenza.
- [x] Verificare che una tab in background o una finestra senza focus non produca heartbeat utili e non aumenti artificialmente il tempo attivo.
- [x] Implementare `scroll_milestone` con soglie deduplicate per pagina, ad esempio 25/50/75/90/100, evitando eventi scroll continui.
- [x] Applicare campionamento solo a eventi ad alta frequenza (`session_heartbeat`, `scroll_milestone`) e includere sempre il `sampleRate` dell'evento.
- [x] Non campionare eventi rari o critici: `session_start`, `session_end`, errori, audit e segnali necessari a ricostruire un percorso critico.
- [x] Implementare batching client: buffer in memoria, flush periodico, flush per soglia di eventi, flush immediato su `pagehide`, `sendBeacon` preferito e fallback `fetch` con `keepalive`.
- [x] Evitare retry persistenti in storage locale per non introdurre code invasive, duplicati o identificatori non necessari.
- [x] Implementare deduplicazione lato client per `session_start`, `page_enter`, `page_exit` e milestone scroll già inviate nello stesso `pageInstanceId`.
- [x] Implementare debounce/throttle per interazioni, scroll e flush, in modo che il collector non riceva spam da eventi browser ad alta frequenza.
- [x] Leggere il consenso privacy disponibile nel prodotto e combinare consenso, Do Not Track e Global Privacy Control in `collectionMode`.
- [x] Definire comportamento `collectionMode = "full"`: session tracking, page events, heartbeat e scroll milestone secondo le regole di Fase 2.
- [x] Definire comportamento `collectionMode = "minimal"`: inviare solo il set minimo ammesso oppure disattivare gli eventi opzionali, senza heartbeat e senza scroll milestone.
- [x] Non introdurre tracking cross-day, cookie marketing, localStorage persistente per identità visitatore o identificatori per-visitatore senza requisito prodotto esplicito.
- [x] Derivare `visitorHash` solo lato server da IP, user-agent e salt giornaliero, usando la stessa decisione privacy-first della Fase 0.
- [x] Aggiornare il service di sessionizzazione per creare o aggiornare `ObservabilitySession` a partire dai batch ricevuti.
- [x] Aggiornare `ObservabilitySession.startedAt`, `lastSeenAt`, `endedAt`, `landingPath`, `exitPath`, `referrerDomain`, `country`, `userAgent` limitato e `updatedAt` secondo gli eventi ricevuti.
- [x] Salvare ogni evento valido in `ObservabilityEvent` append-only con `receivedAtServer` autorevole, `sampleRate`, `clientSequence`, `clientElapsedMs`, `requestId`, `correlationId`, `release`/`buildId` quando disponibili.
- [x] Non scrivere su `ObservabilityEvent` campi interpretati come fatti certi: niente `engagementLevel`, `completed`, `qualityScore`, `exitType`, `perceivedQuality` o valori equivalenti.
- [x] Valutare la sanità dei timing client con le regole di Fase 0: sequenza negativa o non intera rifiutata, delta negativo o eccessivo marcato come sospetto, non usato come durata autorevole.
- [x] Implementare rate limit del collector per IP e per `sessionId`, separato dalle policy CMS, con Redis obbligatorio in produzione e fallback locale/test ammesso dove già previsto dal progetto.
- [x] Assorbire il rate limit del collector con risposta `204` e nessuna scrittura, invece di trasformare il collector pubblico in un endpoint rumoroso o enumerabile.
- [x] Loggare internamente solo anomalie operative del collector con metadata redatti, senza body request, token, Authorization header, cookie o dati personali non necessari.
- [x] Implementare bot filtering base nel service usando user-agent denylist/pattern, assenza di segnali umani, marker headless, incongruenze header disponibili e timing client/server sospetto.
- [x] Salvare le sessioni probabili bot con `isLikelyBot = true` e motivazioni diagnostiche redatte se previste dallo schema, senza cancellarle e senza contaminarle negli aggregati futuri.
- [x] Non usare il bot filtering per bloccare automaticamente errori o audit critici: il flag serve a escludere gli aggregati qualitativi, non a perdere segnali operativi.
- [x] Derivare `pageType` in modo conservativo quando il client non lo passa: home, article, issue, static_page, listen, media; lasciare `contentId` nullo se non disponibile senza lookup costosi in Fase 2.
- [x] Non implementare in Fase 2 `ContentEngagement`, `PerformanceExperience`, quality score, completion, active time aggregato autorevole o dashboard editoriali: appartengono alle fasi successive.
- [x] Aggiornare export/import del modulo per esporre solo il nuovo collector/session tracker come API ufficiale, rimuovendo DTO e tipi legacy non più usati.
- [x] Aggiornare i test client che proteggevano `page_view`, `web-vital` e `FID`, eliminando quelle aspettative invece di mantenerle come compatibilità nascosta.
- [x] Aggiungere test client per creazione sessione, rotazione dopo 30 minuti, `session_start`, `page_enter`, `page_exit`, `session_end`, heartbeat solo attivo, tab background, scroll milestone deduplicate, batching, `sendBeacon`, fallback `fetch keepalive`, path tecnici e privacy minimal.
- [x] Aggiungere test route collector per batch valido, payload legacy ignorato, payload invalido, payload oversized, troppi eventi, metadata sensibili, metadata troppo grandi, path tecnico, DNT/GPC, rate limit IP e rate limit sessione.
- [x] Aggiungere test service per creazione sessione, aggiornamento `lastSeenAt`, `landingPath`, `exitPath`, visitor hash giornaliero, salvataggio eventi append-only, normalizzazione path/referrer, timestamp server autorevole e timing client sospetto.
- [x] Aggiungere test bot filtering per user-agent bot, user-agent mancante, heartbeat senza interazioni, marker headless, skew eccessivo e sessione umana non marcata bot.
- [x] Verificare con `prisma validate`, generazione client se lo schema cambia, typecheck, lint e unit test pertinenti.
- [x] Aggiornare questo documento se durante l'implementazione emergono decisioni operative su soglie batch, rate limit, privacy minimal o bot reasons, senza creare checklist parallele.

Deliverable Fase 2:

- [x] Contratto batch-only di `/api/telemetry` con schema Zod e payload legacy non accettati.
- [x] Client pubblico di session tracking che sostituisce il tracciamento page-view/Web-Vitals legacy.
- [x] Service di sessionizzazione che aggiorna `ObservabilitySession` e scrive `ObservabilityEvent` append-only.
- [x] Rate limiter collector per IP e sessione.
- [x] Bot detection base con flag `isLikelyBot` sulla sessione.
- [x] Privacy mode collegato a consenso, DNT e Global Privacy Control.
- [x] Test unitari e route test sui casi critici della raccolta.

Criterio di completamento:

- [x] Una visita reale produce `ObservabilitySession` e una sequenza coerente di `ObservabilityEvent`: `session_start`, `page_enter`, heartbeat se attiva, `page_exit`, `session_end` quando possibile.
- [x] Refresh, ritorni rapidi e navigazioni interne non producono false letture qualificate e non reintroducono page views come metrica primaria.
- [x] Una tab lasciata aperta in background o senza focus non produce tempo attivo infinito né heartbeat utili.
- [x] Una sessione bot evidente viene marcata `isLikelyBot = true` e resta disponibile per debug, ma sarà esclusa dagli aggregati qualitativi futuri.
- [x] Il collector non accetta né conserva contratti legacy come `page_view`, `web-vital`, `FID`, `AnalyticsEvent`, `WebVital` o `ErrorLog`.
- [x] Privacy, metadata e timestamp rispettano le decisioni della Fase 0: minimizzazione, niente query sensibili, niente clock client autorevole, niente identità cross-day.
- [x] Il sistema resta funzionante e verificabile dopo la sostituzione del collector, anche se engagement contenuti, performance qualitativa, aggregati e dashboard arrivano nelle fasi successive.

Verifiche eseguite:

- `pnpm prisma:generate`
- `pnpm prisma:validate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:run tests/unit/lib/server/modules/telemetry/schema.test.ts tests/unit/app/api/telemetry/route.test.ts tests/unit/lib/server/modules/telemetry/service.test.ts tests/unit/lib/telemetry/client.test.ts`
- `pnpm test:run`

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

Assunzione operativa: la Fase 1 e la Fase 2 sono state completate come descritte. Esistono quindi `ObservabilitySession`, `ObservabilityEvent`, errori su modello nuovo, collector pubblico batchato, session tracking anonimo, rate limit, bot filtering, privacy gating, sample rate sugli eventi ad alta frequenza e raw event coerenti. La Fase 3 non deve rifare sessionizzazione, rate limit o bot filtering: li usa.

Principio di questa fase: engagement-first, no retrocompatibilità. `page_view`, `article_view`, `issue_view`, `listen_view`, `media_open` come vecchi eventi analytics non sono fonte autorevole e non vanno adattati. Se componenti, DTO, procedure, test o schermate continuano a ragionare in termini di views, si buttano via o si riscrivono. Non si mantiene un doppio tracciamento views + engagement per proteggere codice provvisorio. Il raw event può contenere segnali tecnici di ingresso pagina, ma la UI telemetry lavora su `ContentEngagement` e, per l'audio, `AudioEngagement`.

Scelta dello slice interpretato: `ContentEngagement` + `AudioEngagement`. `ContentEngagement` misura consumo e intenzione su home, articoli, issue, pagine statiche, listen e media. `AudioEngagement` è separato perché l'ascolto ha regole proprie: progress, listened time, seek, replay e completion non sono scroll.

Modelli introdotti in questa fase:

- `ContentEngagement`
- `AudioEngagement`

Eventi raw ammessi come input di Fase 3: `page_enter`, `page_exit`, `visibility_change`, `session_heartbeat`, `scroll_milestone`, `content_interaction`, `navigation_click`, `audio_start`, `audio_progress`, `audio_complete`, `audio_seek`, `audio_replay`, `media_open`, `media_download`. Eventi analytics legacy come `page_view`, `article_view`, `issue_view`, `listen_view` e `web-vital` non sono API ufficiali di questa fase.

Checklist operativa Fase 3:

- [x] Rimuovere dal percorso pubblico attivo i tracker provvisori basati su views: `PublicPageViewTracker`, chiamate a `track({ event: "page_view" })` e ogni equivalente `article_view`, `issue_view`, `listen_view`, `media_open` legacy.
- [x] Rimuovere dal client telemetry ufficiale le API analytics legacy (`track`, `AnalyticsEvent`) e sostituirle con il collector engagement; niente alias o wrapper compatibili con il vecchio contratto.
- [x] Rimuovere dal flusso telemetry editoriale ogni dipendenza da `reportWebVital`, `FID` e payload `web-vital`; la performance qualitativa appartiene alla Fase 5, non è una base provvisoria per l'engagement.
- [x] Rimuovere o riscrivere procedure, DTO, prefetch e schermate CMS che espongono `views`, `page views`, `visitors` o aggregate views-based come metrica primaria della telemetry editoriale.
- [x] Creare `ContentEngagement` nello schema Prisma con campi: `id`, `sessionId`, `visitorHash`, `contentType`, `contentId`, `slug`, `path`, `pageType`, `firstSeenAt`, `lastSeenAt`, `activeTimeMs`, `maxScrollDepth`, `scrollMilestones`, `interactionCount`, `returnCountInSession`, `refreshCount`, `completed`, `engagementLevel`, `exitType`, `sampleRate`, `createdAt`, `updatedAt`.
- [x] Creare `AudioEngagement` nello schema Prisma con campi: `id`, `sessionId`, `visitorHash`, `articleId`, `path`, `started`, `completed`, `listenedMs`, `completionRate`, `seekCount`, `replayCount`, `firstSeenAt`, `lastSeenAt`, `createdAt`, `updatedAt`.
- [x] Collegare `ContentEngagement` a `ObservabilitySession` con `sessionId` nullable solo dove il collector consente esplicitamente eventi senza sessione, senza inventare sessioni finte.
- [x] Collegare `AudioEngagement` a `ObservabilitySession` e al contenuto articolo quando disponibile, senza dipendere da slug come chiave autorevole se esiste `articleId`.
- [x] Aggiungere indici minimi per engagement: `sessionId`/`path`, `sessionId`/`contentId`, `contentType`/`contentId`/`firstSeenAt`, `pageType`/`firstSeenAt`, `engagementLevel`/`firstSeenAt`, `completed`/`firstSeenAt`.
- [x] Aggiungere indici minimi per audio: `sessionId`/`articleId`, `articleId`/`firstSeenAt`, `completed`/`firstSeenAt`.
- [x] Generare una migrazione Prisma netta, senza tabelle ponte, backfill views, mapping da analytics legacy o preservazione di conteggi provvisori.
- [x] Definire schema Zod per i payload batch engagement accettati dal collector: page event, scroll milestone, interaction, audio event, media event.
- [x] Validare in Zod i valori canonici di `pageType`, `contentType`, `engagementLevel` e `exitType`, riusando i vocabolari della Fase 0.
- [x] Limitare metadata engagement a shape e dimensione già definite in Fase 0, senza accettare body request, token, query string sensibili o valori ad alta cardinalità non necessari.
- [x] Aggiornare `/api/telemetry` o il collector equivalente per accettare batch engagement oltre agli errori, riusando session tracking, privacy gating, rate limit e bot filtering della Fase 2.
- [x] Garantire che gli eventi campionabili (`session_heartbeat`, `scroll_milestone`) portino `sampleRate` e che eventi critici (`page_enter`, `page_exit`, `audio_complete`) non vengano campionati.
- [x] Implementare un client `PublicEngagementTracker` o equivalente che invii `page_enter`, `page_exit`, `visibility_change`, heartbeat attivi, scroll milestone deduplicate e interazioni reali.
- [x] Calcolare lato client i delta di tempo attivo con `performance.now()`, heartbeat ogni 15s, idle threshold 30s e cap 20s, senza usare wall clock come fonte di durata.
- [x] Bloccare l'accumulo di active time quando la pagina è hidden, la finestra non ha focus o non ci sono interazioni recenti.
- [x] Inviare `page_exit` con `sendBeacon` o fallback `fetch keepalive`, includendo l'ultimo active time accumulato e l'exit context disponibile.
- [x] Deduplicare lato client le scroll milestone, evitando eventi ripetuti per la stessa soglia nella stessa pagina.
- [x] Collegare ogni route pubblica al contesto osservabile esplicito, senza inferenze fragili da path quando il server conosce il contenuto: home, articolo, issue, pagina statica, listen, media.
- [x] Passare `pageType`, `contentType`, `contentId`, `slug` e path canonico al tracker dalle pagine pubbliche o da un provider contestuale.
- [x] Cablare gli articoli con `pageType = "article"`, `contentType = "article"`, `contentId = article.id`, slug e lunghezza del contenuto quando disponibile.
- [x] Cablare le issue con `pageType = "issue"`, `contentType = "issue"`, `contentId = issue.id`, slug e segnali di interazione con blocchi o navigazione verso articoli.
- [x] Cablare le pagine statiche con `pageType = "static_page"`, `contentType = "page"`, `contentId = page.id` quando disponibile.
- [x] Cablare la home con `pageType = "home"`, segnali di esplorazione, scroll e click verso contenuti, senza fingere un `contentId`.
- [x] Cablare la pagina ascolta con `pageType = "listen"`, `contentType = "article"`, `contentId = article.id` e segnali audio dedicati.
- [x] Cablare media open/download/interazione con `pageType = "media"`, `contentType = "media"`, `contentId` quando disponibile.
- [x] Implementare nel player audio gli eventi `audio_start`, `audio_progress`, `audio_complete`, `audio_seek`, `audio_replay`, con progress deduplicato e non rumoroso.
- [x] Implementare repository engagement separato da telemetry legacy, con metodi per upsert di `ContentEngagement`, upsert di `AudioEngagement`, lettura summary, lista contenuti e dettaglio contenuto.
- [x] Implementare service engagement che trasforma raw event in episodi interpretati, mantenendo nel service le regole di active time, ritorni, refresh, completion ed engagement level.
- [x] Calcolare `firstSeenAt` come primo `receivedAtServer` utile e `lastSeenAt` come ultimo `receivedAtServer` utile, non da wall clock client.
- [x] Calcolare `activeTimeMs` da delta monotonici validati e cappati, sommando solo segmenti attivi.
- [x] Calcolare `maxScrollDepth` e `scrollMilestones` come massimo e insieme deduplicato delle milestone ricevute.
- [x] Calcolare `interactionCount` da interazioni umane reali, non da heartbeat o eventi automatici.
- [x] Calcolare `refreshCount` quando lo stesso `sessionId` rientra sullo stesso path entro pochi secondi senza nuovo percorso significativo.
- [x] Calcolare `returnCountInSession` quando lo stesso `sessionId` torna allo stesso contenuto dopo navigazione o intervallo significativo nella stessa sessione.
- [x] Derivare `exitType` come `bounce`, `internal_navigation`, `external_exit` o `unknown` usando eventi di exit e navigazione disponibili, senza scriverlo come fatto catturato sul raw event.
- [x] Derivare `engagementLevel` per articolo da active time, scroll depth, lunghezza contenuto e completamento; soglie iniziali configurabili, non costanti sparse.
- [x] Derivare `engagementLevel` per issue da interazione con blocchi, scroll, navigazione verso articoli e ritorni.
- [x] Derivare `engagementLevel` per home da esplorazione, scroll e click verso contenuti, trattando `completed` come caso raro e definito esplicitamente.
- [x] Derivare `engagementLevel` per listen da audio progress e listened time, non da scroll.
- [x] Derivare `engagementLevel` per media da apertura, durata, download o interazione reale.
- [x] Derivare `completed` per articoli da scroll alto, active time coerente con lunghezza e segnali finali disponibili.
- [x] Derivare `completed` per audio da `completionRate` alta o `audio_complete`, con soglia iniziale esplicita.
- [x] Escludere di default dagli output qualitativi le sessioni `isLikelyBot = true`, pur mantenendo i raw event e gli episodi per debug se già salvati.
- [x] Rendere soglie engagement iniziali configurabili per `pageType`: active time minimo, scroll minimo, completion scroll, audio completion rate, refresh window, return window.
- [x] Versionare o nominare il set di soglie usato per derivare engagement, così una futura calibrazione può spiegare perché un episodio è stato classificato in un certo modo.
- [x] Creare DTO CMS per summary telemetry engagement con `qualifiedVisits`, `completedReads`, `completionRate`, `averageActiveTimeMs`, `engagementBreakdown`, `topContent`, `lowQualityContent`, `sampleConfidence`.
- [x] Creare DTO CMS per lista contenuti con titolo o fallback slug/path, `contentType`, `pageType`, qualified reads, completed reads, completion rate, active time medio, ritorni in sessione, score o rank qualitativo provvisorio.
- [x] Creare DTO CMS per dettaglio contenuto con breakdown `glance`/`scan`/`engaged`/`completed`, scroll distribution, active time, ritorni, refresh, exit type e audio breakdown se presente.
- [x] Creare procedure tRPC per `engagementSummary`, `contentEngagementList` e `contentEngagementDetail`, con input periodo, `pageType`, `contentType` e query testo dove utile.
- [x] Rimuovere o rinominare procedure legacy `analyticsSummary` se continuano a significare views, invece di cambiarne silenziosamente il significato mantenendo lo stesso contratto.
- [x] Aggiornare prefetch CMS e tipi `RouterInputs`/`RouterOutputs` per usare le nuove procedure engagement, eliminando tipi legacy non più raggiungibili.
- [x] Sostituire la UI CMS analytics/telemetry con una dashboard editoriale di qualità basata su engagement, non su conteggi grezzi.
- [x] La prima UI deve mostrare KPI qualitativi, breakdown engagement, tabella contenuti, filtri periodo/pageType/contentType e empty state che spiega la generazione degli episodi.
- [x] Non mostrare `views` nella UI Fase 3: se serve una metrica diagnostica di volume, usare un nome nuovo e coerente col modello (`episodi iniziati`, `sessioni con contenuto`, `contenuti aperti`) calcolato da `ContentEngagement`, non da analytics legacy.
- [x] Aggiungere indicatore di affidabilità campione per contenuti con pochi episodi, evitando classifiche aggressive su numeri minimi.
- [x] Aggiornare testi i18n CMS da analytics/page views a engagement, letture qualificate, completamenti, ritorni e tempo attivo.
- [x] Aggiornare export/import del modulo telemetry/engagement in modo che il codice non continui a esporre API legacy come ufficiali.
- [x] Rimuovere test che presuppongono `page_view`, `article_view`, `FID`, aggregate views o `track()` come comportamento desiderato.
- [x] Aggiungere test unitari per classificazione `glance`, `scan`, `engaged`, `completed` su article, issue, home, listen e media.
- [x] Aggiungere test unitari per active time: tab background, finestra senza focus, gap heartbeat, idle lungo, page exit, delta cappato.
- [x] Aggiungere test unitari per refresh vs ritorno nella stessa sessione.
- [x] Aggiungere test unitari per scroll milestone deduplicate e max scroll depth.
- [x] Aggiungere test unitari per audio: start, progress, seek, replay, completionRate e completed.
- [x] Aggiungere test service/repository per creazione e aggiornamento di `ContentEngagement` da sequenze raw realistiche.
- [x] Aggiungere test service/repository per creazione e aggiornamento di `AudioEngagement` da sequenze audio realistiche.
- [x] Aggiungere route test collector per batch engagement valido, payload invalido, payload oversized, metadata troppo grandi, path tecnici, DNT/GPC/privacy gating e sampleRate.
- [x] Aggiungere test tRPC/DTO per summary, lista contenuti, dettaglio contenuto e output validato con `parseOutput`.
- [x] Verificare con `prisma validate`, generazione client, typecheck, lint e unit test pertinenti.
- [x] Aggiornare questo documento se durante l'implementazione emergono decisioni di soglia o schema che precisano Fase 3, senza creare checklist parallele.

Deliverable Fase 3:

- [x] Migrazione Prisma netta con `ContentEngagement` e `AudioEngagement`, senza backfill o mapping da analytics legacy.
- [x] Collector engagement pubblico integrato con sessione, privacy, bot filtering, rate limit e batching della Fase 2.
- [x] Tracker pubblico contestuale per home, articoli, issue, pagine statiche, listen e media.
- [x] Eventi audio cablati nel player e trasformati in `AudioEngagement`.
- [x] Repository engagement per scrittura episodi, summary, lista e dettaglio.
- [x] Service engagement per derivare active time, scroll, refresh, ritorni, completion, exit type ed engagement level.
- [x] DTO CMS per summary telemetry, lista contenuti e dettaglio contenuto.
- [x] Procedure tRPC engagement con policy e output validation.
- [x] UI CMS telemetry basata su letture qualificate, completamenti, ritorni e tempo attivo.
- [x] Test unitari, route test e tRPC/service test che dimostrano il percorso end-to-end.

Criterio di completamento:

- [x] Una visita reale a un articolo produce raw event coerenti e un `ContentEngagement` con active time, scroll, engagement level e completed derivati.
- [x] Una visita breve senza scroll e senza interazioni resta `glance` e non diventa lettura qualificata.
- [x] Una lettura reale con tempo attivo e scroll coerenti diventa `engaged` o `completed` secondo soglie spiegabili.
- [x] Refresh rapidi incrementano `refreshCount` e non creano false letture equivalenti.
- [x] Ritorni allo stesso contenuto nella stessa sessione incrementano `returnCountInSession` senza simulare tracking cross-day.
- [x] Una tab lasciata aperta in background non aumenta `activeTimeMs` in modo significativo.
- [x] Una sessione bot evidente resta esclusa dagli output qualitativi di default.
- [x] Una sessione listen produce `AudioEngagement` con listened time, completion rate e completed quando l'audio viene consumato davvero.
- [x] La UI telemetry mostra letture qualificate, completamenti, completion rate, active time e breakdown engagement senza usare page views come proxy.
- [x] Nessun componente, DTO, procedura o test ancora raggiungibile considera `page_view`, `FID`, `AnalyticsEvent` o aggregate views-based come API ufficiale della telemetry editoriale.
- [x] Il sistema resta funzionante e verificabile dopo la rimozione del legacy, anche se performance qualitativa, aggregati giornalieri e overview trasversale arrivano nelle fasi successive.

Verifiche eseguite:

- `pnpm prisma generate`
- `pnpm prisma validate`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:run tests/unit/lib/server/modules/telemetry/schema.test.ts tests/unit/lib/server/modules/telemetry/service.test.ts tests/unit/lib/telemetry/client.test.ts tests/unit/app/api/telemetry/route.test.ts`
- `pnpm test:run`

### Fase 4: Errori Operativi

Obiettivo: trasformare errors da lista aggregata a inbox operativa per impatto.

Assunzione operativa: la Fase 1, la Fase 2 e la Fase 3 sono state completate come descritte. Esistono quindi schema autorevole `ObservabilitySession`, `ObservabilityEvent`, `ErrorGroup`, `ErrorOccurrence`, collector batch/sessionizzato, bot filtering, rate limit, privacy gating, engagement contenuti e raw event coerenti. Il vecchio modello basato su `ErrorLog`, errori aggregati per solo `count`, API errori dentro telemetry legacy, page views, Web Vitals legacy e DTO provvisori non è più vincolante e non va protetto.

Principio di questa fase: errors-first, no retrocompatibilità. Gli errori operativi diventano un dominio autonomo di osservabilità, non una sottopagina della telemetry editoriale. Se procedure, DTO, service, repository, UI, test o copy continuano a parlare di `ErrorLog`, grouped count, `telemetry errors`, `listErrorLogs`, `upsertErrorLog`, `analytics`, `web-vital`, `page_view` o fingerprint provvisorio, si eliminano o si riscrivono. Non si mantengono alias tRPC, wrapper legacy, mapping vecchio-nuovo, doppie query o schermate compatibili con il modello provvisorio.

Scelta dello slice interpretato: `ErrorGroup` + `ErrorOccurrence` restano le entità autorevoli, ma la Fase 4 le completa come inbox operativa. `ErrorOccurrence` è il fatto catturato; `ErrorGroup` è la sintesi interpretata con stato operativo, impatto, regressione, priorità e contatori derivati.

Checklist operativa Fase 4:

- [x] Estrarre gli errori operativi dal modulo telemetry provvisorio in un modulo dedicato, ad esempio `lib/server/modules/observability-errors/*`, con `schema`, `dto`, `policy`, `repository`, `service` e `index` separati.
- [x] Rimuovere dal modulo telemetry ogni responsabilità ufficiale sugli errori operativi: DTO `TelemetryError*`, schema error-specific, metodi `listErrorGroups`, `getErrorGroupById`, `updateErrorGroupStatus`, fingerprint locale e record server/client error se restano lì solo per inerzia.
- [x] Rimuovere o rinominare procedure tRPC legacy come `telemetry.errorsList`, `telemetry.errorDetail` e `telemetry.updateErrorStatus`, senza alias compatibili; il nuovo contratto deve vivere in un router dedicato agli errori operativi.
- [x] Rimuovere test, mock e aspettative ancora basati su `ErrorLog`, `listErrorLogs`, `upsertErrorLog`, `count` come metrica primaria, `track`, `page_view`, `web-vital`, `FID` o errori trattati come appendice analytics.
- [x] Confermare che `ErrorGroup` e `ErrorOccurrence` nello schema Prisma contengano tutti i campi definiti dal modello: fingerprint/versione/signature, source, severity, status, first/last seen, occurrence count, affected sessions, affected paths, impact area, user impact, regression, release, resolved metadata, occurrence context e stack redatto.
- [x] Aggiungere allo schema, se non già presenti, campi operativi per ordinamento e lifecycle: `priorityScore`, `priorityReasons`, `reopenedAt`, `reopenedBy`, `lastStatusAt`, `lastStatusBy`, con indici per `priorityScore`/`lastSeenAt`, `regression`/`lastSeenAt` e `lastRelease`/`lastSeenAt`.
- [x] Decidere esplicitamente se introdurre una tabella `ErrorStatusEvent`; se non viene introdotta in questa fase, non simulare una timeline completa in UI e limitarsi ai timestamp operativi realmente salvati.
- [x] Generare una migrazione Prisma netta per i campi mancanti, senza colonne ponte, backfill da `ErrorLog`, mapping da conteggi legacy o preservazione di fingerprint provvisori.
- [x] Usare un solo algoritmo autorevole di fingerprint, quello del modello osservabilità (`createObservabilityErrorFingerprint` o equivalente), eliminando duplicazioni locali nel service errori.
- [x] Implementare parser deterministico dello stack trace verso frame applicativi normalizzati: funzione, modulo/path relativo, esclusione vendor/node_modules, rimozione linee/colonne, UUID, numeri, hex, query string e path assoluti.
- [x] Salvare sempre `fingerprintVersion`; un cambio algoritmo deve essere esplicito e versionato, non un cambio silenzioso nella funzione.
- [x] Implementare `errorSignature` grossolana come secondo livello di matching per regressioni: tipo errore, template messaggio redatto e `impactArea`, senza dati dinamici o sensibili.
- [x] Gestire errori HTTP/network con fingerprint basato su method, route template non path concreto, classe status e contesto applicativo, non su URL con parametri o query string.
- [x] Centralizzare redazione di messaggio, stack trace, metadata, user-agent, path e route context riusando le regole privacy della Fase 0, senza body request, Authorization header, token, cookie o query sensibili.
- [x] Definire schema Zod per input di registrazione occorrenza client, server e boundary, riusando vocabolari canonici di source, severity, status, impact area e user impact senza enum paralleli.
- [x] Aggiornare `/api/telemetry` o il collector pubblico per inviare gli eventi errore al nuovo service errori, mantenendo risposta non informativa `204` per payload invalidi, legacy, oversized o non applicabili.
- [x] Aggiornare `instrumentation.ts` o il punto equivalente di cattura server error per chiamare il nuovo service errori, non il service telemetry provvisorio.
- [x] Garantire che un errore server senza `sessionId` venga registrato correttamente con request/path/route/release quando disponibili, senza inventare sessioni finte.
- [x] Garantire che un errore client o boundary con `sessionId` venga collegato a `ObservabilitySession`, `ObservabilityEvent` e `ErrorOccurrence` senza duplicare raw event inutili.
- [x] Salvare sempre una nuova `ErrorOccurrence` per ogni errore valido, anche quando il gruppo esiste già; il gruppo contiene sintesi e contatori, non sostituisce il dettaglio.
- [x] Implementare transazione atomica nel repository: upsert/lookup sessione se necessaria, creazione raw event se prevista, lookup gruppo per fingerprint, lookup signature risolta per regressione, creazione occorrenza, aggiornamento gruppo.
- [x] Calcolare `affectedSessions` come conteggio distinct di sessioni non nulle impattate, non come incremento ingenuo a ogni occorrenza.
- [x] Calcolare `affectedPaths` come insieme limitato e redatto di path o route più rilevanti, con limite esplicito e ordine utile, non come dump illimitato.
- [x] Derivare `impactArea` in modo deterministico da action context, route template, path, source e status: `auth`, `editorial`, `media`, `cms`, `public_site`, `unknown`.
- [x] Definire precedenza di `impactArea` quando più aree matchano, ad esempio `auth` > `editorial` > `media` > `cms` > `public_site` > `unknown`.
- [x] Normalizzare `actionContext` su valori canonici iniziali: `login`, `publish`, `unpublish`, `save_editorial`, `upload_media`, `delete_media`, `delete_content`, `update_navigation`, `role_change`, `unknown`.
- [x] Derivare `userImpact` da action context, status, source e contesto: `none`, `minor`, `blocked_action`, `lost_content`.
- [x] Derivare `severity` da impatto e contesto, non dalla sola frequenza: login/upload/publish/salvataggio editoriale almeno `high`; ruolo/auth security o perdita contenuto `critical`; errore pubblico visibile almeno `medium`; errore raro invisibile `low`.
- [x] Impedire che alta frequenza da sola trasformi un errore `low` in `critical`; la frequenza deve aumentare priorità operativa, non falsare severità.
- [x] Calcolare `priorityScore` come derivato operativo separato da `severity`, combinando severity, user impact, area sensibile, status code e regressione quando rilevata.
- [x] Salvare `priorityReasons` insieme a `priorityScore`, così la UI può spiegare perché un errore sta sopra gli altri.
- [x] Ordinare di default la inbox per priorità operativa e recenza, non per `occurrenceCount` grezzo.
- [x] Implementare lifecycle status esplicito per `open`, `investigating`, `resolved`, `ignored`, con transizioni ammesse e rifiuto deterministico delle transizioni non valide.
- [x] Su status `resolved`, salvare `resolvedAt`, `resolvedBy`, `lastStatusAt`, `lastStatusBy`.
- [x] Su riapertura manuale, salvare `reopenedAt`, `reopenedBy`, `lastStatusAt`, `lastStatusBy` e aggiornare status senza cancellare arbitrariamente la storia utile.
- [x] Definire comportamento di `ignored`: resta ignorato per rumore noto, ma una nuova occorrenza critical o una regressione esplicita può riaprirlo solo se la regola è codificata e testata.
- [x] Implementare regressione per fingerprint: se un gruppo `resolved` riceve una nuova occorrenza dopo la risoluzione, torna operativo, viene marcato `regression = true` e aumenta priorità.
- [x] Implementare regressione per signature: se una `errorSignature` già risolta ricompare con fingerprint diverso, il nuovo gruppo viene marcato come possibile regressione.
- [x] Usare `release`/`buildId` quando disponibili per rafforzare la detection: ricomparsa dopo release diversa o successiva aumenta priorità e viene esposta in UI.
- [x] Non marcare regressione quando manca evidenza sufficiente: distinguere `regression = true` da semplice nuovo errore con signature simile se la storia non supporta la conclusione.
- [x] Implementare repository errori separato con metodi espliciti per record occurrence, list groups, count groups, detail group, update status, lookup fingerprint, lookup resolved signature e update operational summary.
- [x] Implementare service errori con business rules pure per fingerprint, signature, severity, impact, priority, regressione e status lifecycle; il repository deve fare persistenza, non decidere regole qualitative.
- [x] Creare DTO CMS per lista errori con `id`, `title`, `source`, `severity`, `status`, `priorityScore`, `priorityReasons`, `occurrenceCount`, `affectedSessions`, `affectedPaths`, `impactArea`, `userImpact`, `regression`, `firstSeenAt`, `lastSeenAt`, `firstRelease`, `lastRelease`.
- [x] Creare DTO CMS per dettaglio errore con fingerprint, versione, signature, stato operativo, resolved/reopened metadata, breakdown priorità, ultime occorrenze, request/session/correlation id, path/route/action context, stack redatto e metadata redatti.
- [x] Creare schema input tRPC per lista con filtri: testo, source, severity, status, impact area, user impact, regression, release, date range, sort e paginazione.
- [x] Creare procedure tRPC dedicate per `list`, `detail` e `updateStatus`, con policy del modulo errori, service orchestration e `parseOutput` sui DTO.
- [x] Non hardcodare ruoli nelle procedure: usare `policy` del modulo errori come per gli altri moduli CMS.
- [x] Aggiornare prefetch CMS, tipi `RouterInputs`/`RouterOutputs` e query parser per usare il nuovo router errori, eliminando tipi telemetry legacy non più raggiungibili.
- [x] Spostare o riscrivere la UI CMS errori fuori da `features/cms/telemetry` se il naming resta fuorviante; la schermata deve rappresentare una inbox operativa autonoma.
- [x] Rifare la prima UI della Fase 4 con KPI essenziali: errori aperti, critical/high, regressioni, nuovi nelle ultime 24h o 7d, sessioni impattate.
- [x] Implementare tabs operative: `Aperti`, `Investigating`, `Risolti`, `Ignorati`, più eventuale filtro rapido `Regressioni` se utile.
- [x] Implementare lista ordinata per priorità con badge severity/status/source/impact/regression, titolo redatto, area, user impact, sessioni impattate, occorrenze e ultima vista.
- [x] Implementare filtri UI per source, severity, status, impact area, user impact, release, date range e testo su titolo/fingerprint/request/path.
- [x] Implementare dettaglio in `Sheet` o `Dialog` con timeline operativa disponibile, occorrenze recenti, stack redatto, metadata redatti, contesto request/session/correlation e azioni status.
- [x] Aggiungere copy button per `fingerprint`, `errorSignature`, `requestId`, `correlationId`, `sessionId` e `errorGroupId`.
- [x] Mostrare sempre perché un errore è prioritario: `priorityReasons`, user impact, area, regressione e sessioni impattate devono essere leggibili senza leggere lo stack.
- [x] Non usare `occurrenceCount` come titolo o ordinamento primario della UI; resta metrica diagnostica secondaria.
- [x] Aggiornare testi i18n CMS da “errori telemetry aggregati” a “inbox operativa errori”, con copy che spiega impatto, regressione, stato e occorrenze.
- [x] Aggiungere empty state che spiega che gli errori appaiono quando collector client, boundary o instrumentation server registrano occorrenze valide.
- [x] Aggiungere test unitari per fingerprint v1: UUID, numeri, linee/colonne, query string, path assoluti, frame vendor e route template non devono produrre falsi gruppi.
- [x] Aggiungere test unitari per `errorSignature` e regressione cross-fingerprint.
- [x] Aggiungere test unitari per derivazione `impactArea`, `actionContext`, `userImpact`, `severity`, `priorityScore` e `priorityReasons`.
- [x] Aggiungere test unitari per lifecycle status: transizioni valide, transizioni invalide, resolve, reopen manuale, ignored e update metadata operativi.
- [x] Aggiungere test service/repository per nuova occorrenza, occorrenza ripetuta, distinct affected sessions, affected paths limitati, gruppo risolto che regredisce e signature risolta che ricompare con fingerprint diverso.
- [x] Aggiungere route test collector per errore client valido, payload legacy ignorato, payload invalido, oversized, metadata sensibili, sessionId presente, sessionId assente dove consentito e risposta sempre non informativa.
- [x] Aggiungere test instrumentation per errore server registrato nel nuovo service e fallback log redatto quando la registrazione fallisce.
- [x] Aggiungere test tRPC/DTO per lista, dettaglio, update status, filtri, sort per priorità e output validation con `parseOutput`.
- [x] Aggiungere test UI essenziali per KPI, tabs, filtri, badge regressione, dettaglio, copy technical values e update status se l'infrastruttura test UI del progetto lo consente.
- [x] Verificare con `prisma validate`, generazione client se lo schema cambia, typecheck, lint e unit test pertinenti.
- [x] Aggiornare questo documento se durante l'implementazione emergono decisioni su priority score, status history, ignored reopen o regressioni, senza creare checklist parallele.

Deliverable Fase 4:

- [x] Modulo server dedicato agli errori operativi, separato da telemetry editoriale.
- [x] Migrazione Prisma netta per i campi operativi mancanti su `ErrorGroup` e, se scelta, tabella status history.
- [x] Fingerprint v1 unico, versionato, normalizzato e riusato dal service attivo.
- [x] Service errori per record occurrence, severity, impact, priority, regressione e status lifecycle.
- [x] Repository errori per persistenza atomica gruppo/occorrenza e query CMS.
- [x] Collector client-error e instrumentation server-error collegati al nuovo service.
- [x] Procedure tRPC dedicate per lista, dettaglio e update status.
- [x] DTO CMS con priorità, motivazioni, impatto, regressione, gruppo e occorrenze.
- [x] UI CMS errori come inbox operativa, non tabella di conteggi.
- [x] Test unitari, route test, tRPC/service test e, dove possibile, test UI sui casi critici.

Criterio di completamento:

- [x] Un errore client reale attraversa il percorso nuovo: collector → sessione/evento osservabilità → `ErrorOccurrence` → `ErrorGroup` → DTO → inbox CMS.
- [x] Un errore server reale attraversa il percorso nuovo anche senza `sessionId`, usando request/path/route/release quando disponibili.
- [x] Ogni ripetizione dello stesso errore crea una nuova occorrenza e aggiorna il gruppo senza perdere dettaglio operativo.
- [x] Il fingerprint è unico, versionato, normalizzato e non dipende da dati dinamici o sensibili.
- [x] La regressione funziona sia su fingerprint risolto sia su signature grossolana quando il fingerprint cambia dopo refactor o release.
- [x] Severity, user impact, impact area e priority score sono derivati da regole deterministiche e testate.
- [x] La frequenza aumenta priorità ma non falsifica la severità.
- [x] Lo status lifecycle è esplicito, validato e visibile in UI.
- [x] Un admin capisce quali errori risolvere prima senza leggere lo stack.
- [x] Ogni errore importante mostra impatto, area, occorrenze, sessioni impattate, regressione, release e stato operativo.
- [x] Nessun componente, DTO, procedura, test o import ancora raggiungibile considera `ErrorLog`, count-only grouped errors, `telemetry errors`, `page_view`, `web-vital` o fingerprint provvisorio come API ufficiale.
- [x] Il sistema resta funzionante e verificabile dopo la rimozione del legacy, anche se performance qualitativa, audit qualitativo, aggregati giornalieri e overview trasversale arrivano nelle fasi successive.

Verifiche eseguite:

- `pnpm prisma generate`
- `pnpm prisma validate`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:run tests/unit/lib/server/modules/observability-errors/service.test.ts tests/unit/lib/server/modules/telemetry/service.test.ts tests/unit/app/api/telemetry/route.test.ts tests/unit/instrumentation.test.ts tests/unit/lib/server/modules/observability/model.test.ts`
- `pnpm test:run tests/unit/lib/server/modules/observability-errors/service.test.ts tests/unit/lib/server/modules/observability-errors/repository.test.ts tests/unit/lib/server/trpc/routers/observability-errors.test.ts tests/unit/lib/server/modules/telemetry/service.test.ts tests/unit/app/api/telemetry/route.test.ts tests/unit/instrumentation.test.ts tests/unit/lib/server/modules/observability/model.test.ts`

### Fase 5: Performance Qualitativa

Obiettivo: trasformare i Web Vitals in esperienza percepita e impatto sulla lettura.

Assunzione operativa: la Fase 1, la Fase 2, la Fase 3 e la Fase 4 sono state completate come descritte. Esistono quindi schema autorevole `ObservabilitySession`, `ObservabilityEvent`, `ContentEngagement`, `AudioEngagement`, errori operativi autonomi, collector batch/sessionizzato, bot filtering, rate limit, privacy gating, engagement contenuti e inbox errori con regressioni/priorità. La Fase 5 non deve rifare sessionizzazione, engagement o errori: li usa per interpretare l'impatto della performance.

Principio di questa fase: performance-experience-first, no retrocompatibilità. `WebVital`, payload `web-vital`, `reportWebVital`, `FID`, aggregati tecnici legacy, performance summary provvisori e qualsiasi UI basata su metriche isolate non sono vincoli. Se componenti, DTO, procedure, test o schermate continuano a ragionare in termini di Web Vitals standalone, si buttano via o si riscrivono. Non si mantengono alias, wrapper compatibili, doppie query, mapping vecchio-nuovo o fallback a tabelle rimosse. Il collector può salvare segnali tecnici raw, ma la UI CMS lavora su `PerformanceExperience` e qualità percepita.

Scelta dello slice interpretato: `PerformanceExperience`. La tabella rappresenta l'esperienza percepita di una pagina dentro una sessione, collegabile a contenuto, device, rete, release, engagement, exit ed errori. Le metriche server sono utili ma secondarie: se introdotte in questa fase vivono in `ServerPerformanceSample`, separata da `PerformanceExperience`, perché misurano il backend e non l'esperienza browser.

Eventi raw ammessi come input di Fase 5: `performance_metric` per metriche browser normalizzate e, se implementate metriche server, `server_performance_sample` solo dal backend/instrumentation. Eventi legacy `web-vital`, payload standalone Web Vitals e `FID` non sono API ufficiali di questa fase.

Checklist operativa Fase 5:

- [x] Rimuovere dal percorso attivo qualsiasi codice provvisorio che produce o consuma performance legacy: payload `web-vital`, funzioni `reportWebVital`, tipi `WebVital`, query performance summary legacy, test che aspettano `FID` o Web Vitals standalone e placeholder che proteggono il vecchio modello.
- [x] Non reintrodurre `FID`: la metrica ufficiale di interazione è `INP`; eventuali payload con `FID` vanno rifiutati o ignorati con risposta non informativa, senza mapping automatico a `INP`.
- [x] Definire vocabolari canonici performance riusabili: metriche `lcp`, `inp`, `cls`, `fcp`, `ttfb`; rating tecnico `good`, `needs_improvement`, `poor`; qualità percepita `smooth`, `acceptable`, `frustrating`, `broken`; sample confidence `low`, `medium`, `high`.
- [x] Definire unità canoniche e formattazione: `CLS` senza unità, `LCP`, `INP`, `FCP` e `TTFB` in millisecondi salvati come numero e mostrati in ms o secondi leggibili.
- [x] Definire soglie iniziali versionate per ogni metrica, includendo almeno soglie Core Web Vitals per `LCP`, `INP`, `CLS` e soglie operative iniziali per `FCP` e `TTFB`.
- [x] Rendere soglie e pesi di qualità percepita configurabili e nominati con `thresholdVersion`, senza costanti sparse nei componenti UI.
- [x] Creare `PerformanceExperience` nello schema Prisma con campi: `id`, `sessionId`, `visitorHash`, `observabilityEventId`, `path`, `routePath`, `pageType`, `contentId`, `deviceType`, `browser`, `os`, `connectionType`, `effectiveConnectionType`, `saveData`, `viewportWidth`, `viewportHeight`, `lcp`, `inp`, `cls`, `fcp`, `ttfb`, `rating`, `perceivedQuality`, `causedEarlyExit`, `release`, `thresholdVersion`, `sampleRate`, `occurredAt`, `createdAt`, `updatedAt`.
- [x] Collegare `PerformanceExperience` a `ObservabilitySession` e opzionalmente a `ObservabilityEvent`, con `sessionId` nullable solo nei casi in cui il collector consente esplicitamente segnali non associabili a sessione, senza inventare sessioni finte.
- [x] Aggiungere indici minimi per performance: `sessionId`/`occurredAt`, `path`/`occurredAt`, `pageType`/`occurredAt`, `contentId`/`occurredAt`, `deviceType`/`occurredAt`, `rating`/`occurredAt`, `perceivedQuality`/`occurredAt`, `release`/`occurredAt`.
- [x] Generare una migrazione Prisma netta per `PerformanceExperience`, senza tabelle ponte, backfill Web Vitals legacy, mapping da `FID`, preservazione di aggregati tecnici provvisori o colonne di compatibilità.
- [x] Decidere se introdurre in questa fase `ServerPerformanceSample`; se sì, creare modello separato con `requestId`, `correlationId`, `routePath`, `method`, `statusCode`, `durationMs`, `dbDurationMs`, `cacheStatus`, `trpcProcedure`, `release`, `createdAt` e indici per route/release/status/date.
- [x] Se `ServerPerformanceSample` non viene introdotta in questa fase, non simulare metriche server in UI e non mischiare proxy backend dentro `PerformanceExperience`.
- [x] Aggiungere `PERFORMANCE` a `ObservabilityEventCategory` o equivalente, evitando di classificare performance come `INTERACTION`, `SESSION` o `ERROR` solo per riusare enum esistenti.
- [x] Aggiungere `performance_metric` ai raw event ufficiali del modello osservabilità, e `server_performance_sample` solo se viene implementato il sotto-slice server.
- [x] Definire schema Zod per evento performance nel batch `/api/telemetry`: metric name, value, rating client opzionale non autorevole, path, pageType, contentId, contentType, sampleRate, clientSequence, clientElapsedMs, viewport, network context, release e metadata limitati.
- [x] Validare metric name con enum canonico e rifiutare valori non previsti, in particolare `FID`, senza alias o conversioni legacy.
- [x] Normalizzare lato server le unità: metriche temporali in millisecondi, `CLS` come float unitless, valori negativi o non finiti rifiutati o ignorati.
- [x] Applicare limiti espliciti a valori metrici troppo grandi o impossibili, marcando eventuali timing sospetti senza usarli per qualità percepita.
- [x] Aggiornare `/api/telemetry` per accettare eventi performance solo dentro il payload batch sessionizzato della Fase 2, mantenendo risposta `204` non informativa per legacy, invalidi, oversized, rate limited o non applicabili.
- [x] Non accettare payload standalone `web-vital`; i vecchi test devono essere rimossi o cambiati per confermare il rifiuto, non per preservare il contratto.
- [x] Riusare privacy gating, DNT, Global Privacy Control, path tecnici esclusi, rate limit, bot filtering e metadata redaction già definiti nelle fasi precedenti.
- [x] Definire comportamento `collectionMode = "full"`: raccolta di `LCP`, `INP`, `CLS`, `FCP`, `TTFB`, viewport e network context ammesso.
- [x] Definire comportamento `collectionMode = "minimal"`: niente metriche opzionali ad alta granularità o raccolta ridotta esplicitamente documentata, senza heartbeat o dati comportamentali aggiuntivi.
- [x] Implementare o aggiungere client pubblico di performance, preferibilmente basato sulla libreria `web-vitals`, per misurare `onLCP`, `onINP`, `onCLS`, `onFCP`, `onTTFB` invece di parser custom fragili.
- [x] Se si sceglie di non usare `web-vitals`, documentare nel codice il motivo e coprire con test i casi critici di `PerformanceObserver`; non introdurre una misurazione incompleta solo per evitare una dipendenza piccola.
- [x] Integrare il performance tracker con il tracker pubblico esistente senza fondere responsabilità: session tracking produce contesto, performance tracker produce metriche.
- [x] Allegare `sessionId`, `pageInstanceId`, `clientSequence`, `clientElapsedMs`, path canonico, `pageType`, `contentId`, `contentType` e `release` a ogni evento performance quando disponibili.
- [x] Raccogliere network context consentito: `connectionType`, `effectiveConnectionType`, `saveData`, viewport width/height; non raccogliere dati non necessari o fingerprinting invasivo.
- [x] Non usare wall clock client come timestamp autorevole; `occurredAt` e `receivedAtServer` restano server-side.
- [x] Campionare performance solo se necessario e sempre in modo sample-rate-aware; non campionare segnalazioni di errore o audit correlate.
- [x] Salvare `ObservabilityEvent` raw append-only per ogni evento performance valido, senza scrivere campi interpretati autorevoli sul raw event.
- [x] Implementare repository performance con metodi espliciti per record metric/event, upsert o merge di `PerformanceExperience`, summary, trend metriche, worst pages, segmenti device/browser/connection e dettaglio pagina.
- [x] Implementare service performance con business rules pure per normalizzazione metriche, rating tecnico, qualità percepita, early exit, sample confidence e correlazione con engagement/errori.
- [x] Creare o aggiornare una `PerformanceExperience` per sessione + page instance/path/contenuto, aggregando più metriche browser nello stesso episodio quando arrivano separatamente.
- [x] Calcolare `rating` tecnico come peggiore rating rilevante tra `LCP`, `INP`, `CLS`, `FCP`, `TTFB`, mantenendo anche il breakdown per metrica nei DTO.
- [x] Derivare `perceivedQuality = "smooth"` quando Web Vitals principali sono good e non ci sono segnali di frizione, errori correlati o exit precoce.
- [x] Derivare `perceivedQuality = "acceptable"` quando una metrica è needs-improvement ma engagement/exit non indicano frizione reale.
- [x] Derivare `perceivedQuality = "frustrating"` quando `LCP` o `INP` sono poor, `CLS` è rilevante, oppure una metrica poor è seguita da bounce, active time molto basso o exit precoce.
- [x] Derivare `perceivedQuality = "broken"` solo quando performance degradata è correlata a errore bloccante, caricamento fallito, interazione bloccata o `ErrorGroup` operativo con user impact rilevante.
- [x] Impedire che un Web Vital poor isolato diventi automaticamente `broken`; la metrica tecnica aumenta rischio/priorità, ma l'impatto qualitativo richiede contesto.
- [x] Collegare performance poor a `ContentEngagement` tramite `sessionId`, `path`, `contentId` e finestra temporale, usando `exitType`, `engagementLevel`, `activeTimeMs` e `completed` per stimare impatto sulla lettura.
- [x] Calcolare `causedEarlyExit` quando performance poor precede `page_exit` rapido, `ContentEngagement.exitType = "bounce"`, active time minimo o abbandono prima di segnali di lettura.
- [x] Non calcolare `causedEarlyExit` quando l'evidenza temporale manca o quando l'utente resta engaged/completed nonostante una metrica tecnica poor; distinguere frizione certa, probabile e non dimostrata nei reason DTO se utile.
- [x] Collegare errori operativi da Fase 4 tramite `sessionId`, `requestId`, `correlationId`, path e finestra temporale per classificare esperienze `broken` quando un errore impatta la pagina.
- [x] Escludere di default dagli output qualitativi sessioni `isLikelyBot = true`, pur conservando record per debug se già salvati.
- [x] Calcolare sample confidence in base a sample count, sampleRate e distribuzione temporale: pochi campioni non devono produrre classifiche aggressive.
- [x] Segmentare output per `pageType`, `deviceType`, browser, OS, connection/effective connection, country se disponibile, release e contenuto quando disponibile.
- [x] Calcolare percentili tecnici, almeno p75 per `LCP`, `INP`, `CLS`, `FCP`, `TTFB`, evitando medie ingenue dove i percentili sono la metrica corretta.
- [x] Se i dati sono campionati, implementare calcoli coerenti con `sampleRate` o limitare esplicitamente i percentili ai campioni osservati marcando confidence/limite metodologico.
- [x] Definire DTO CMS summary performance con: total experiences, smooth/acceptable/frustrating/broken count, frustrating rate, poor rate per metrica, early exits after poor performance, sample confidence e periodo.
- [x] Definire DTO CMS Vitals summary con valore p75, rating, soglia good/poor, unità, sample count, trend direction e breakdown per device.
- [x] Definire DTO CMS worst pages con path, pageType, contentId/titolo quando disponibile, perceived quality breakdown, p75 metriche principali, early exit count/rate, affected sessions, dominant device, release e sample confidence.
- [x] Definire DTO CMS performance detail con timeline metriche, segmenti device/browser/connection, engagement correlato, errori correlati, release, raw technical IDs e spiegazione della qualità percepita.
- [x] Creare schema input tRPC per performance summary, trend, worst pages e detail con filtri: periodo, metric, pageType, deviceType, perceivedQuality, release, path/content query, sort e paginazione.
- [x] Creare router tRPC dedicato `performance` o `observabilityPerformance`, non procedure annidate in `telemetry`, con policy del modulo performance, service orchestration e `parseOutput` sui DTO.
- [x] Non hardcodare ruoli nelle procedure: usare `policy` del modulo performance come per gli altri moduli CMS.
- [x] Aggiornare root router, prefetch CMS, tipi `RouterInputs`/`RouterOutputs` e query parser per usare il nuovo router performance, eliminando tipi legacy non più raggiungibili.
- [x] Sostituire il placeholder `/cms/performance` con una pagina reale basata su `PerformanceExperience`, non su raw Web Vitals o aggregati legacy.
- [x] La UI CMS Performance deve aprire con una diagnosi qualitativa: esperienze frustranti/broken, early exits collegati a performance, pagine peggiori per impatto e sample confidence.
- [x] Mostrare cards per `LCP`, `INP`, `CLS`, `FCP`, `TTFB` con valore p75, unità, soglie, rating e campione; non mostrare `FID` in nessun punto.
- [x] Implementare trend per metrica con `LineChart` o equivalente, filtrabile per periodo/device/pageType/release.
- [x] Implementare worst pages ordinate per impatto qualitativo e confidence, non per singolo valore tecnico massimo.
- [x] Implementare segmenti device/browser/connection con breakdown di perceived quality e poor rate.
- [x] Implementare dettaglio pagina in `Sheet` o `Dialog` con metriche, soglie, contesto engagement, early exits, errori correlati, release e copy button per `sessionId`, `requestId`, `correlationId` dove disponibili.
- [x] Mostrare sempre sample count e affidabilità del campione vicino a score, trend e classifiche.
- [x] Aggiungere empty state che spiega che la pagina si popola quando il tracker performance pubblico invia metriche valide e quando esistono abbastanza campioni per interpretarle.
- [x] Aggiornare testi i18n CMS da “Web Vitals provvisori” a “performance qualitativa”, esperienza percepita, frizione, early exit, device e soglie.
- [x] Non usare `views` nella UI Performance; se serve volume, usare esperienze o sessioni misurate da `PerformanceExperience`.
- [x] Aggiungere test unitari per soglie metriche: `LCP`, `INP`, `CLS`, `FCP`, `TTFB`, unità, boundary good/needs/poor e rifiuto di `FID`.
- [x] Aggiungere test unitari per normalizzazione valori: ms, CLS unitless, valori negativi, non finiti, troppo grandi, metriche sconosciute e threshold version.
- [x] Aggiungere test client per invio `LCP`, `INP`, `CLS`, `FCP`, `TTFB`, path tecnici ignorati, privacy minimal, batching, `sendBeacon`/`fetch keepalive` e assenza di `FID`.
- [x] Aggiungere route test collector per batch performance valido, payload `web-vital` legacy ignorato, `FID` rifiutato, payload invalidi, oversized, metadata sensibili, DNT/GPC, rate limit e sampleRate.
- [x] Aggiungere test service/repository per creazione e merge di `PerformanceExperience` da metriche arrivate separatamente nello stesso page instance.
- [x] Aggiungere test service per `perceivedQuality`: smooth, acceptable, frustrating, broken, Web Vital poor senza bounce, Web Vital poor con bounce, errore correlato, sessione bot esclusa.
- [x] Aggiungere test service per `causedEarlyExit` con correlazione temporale a `ContentEngagement`, distinguendo evidenza sufficiente e insufficiente.
- [x] Aggiungere test per segmentazione device/browser/connection, p75, sample confidence e ordinamento worst pages per impatto qualitativo.
- [x] Aggiungere test tRPC/DTO per summary, trend, worst pages, detail, filtri, sort, paginazione e output validation con `parseOutput`.
- [x] Aggiungere test UI essenziali per cards con unità/soglie, assenza `FID`, empty state, sample confidence, worst pages e dettaglio se l'infrastruttura test UI del progetto lo consente.
- [x] Verificare con `prisma validate`, generazione client se lo schema cambia, typecheck, lint e unit test pertinenti.
- [x] Aggiornare questo documento se durante l'implementazione emergono decisioni su soglie, threshold version, sampling dei percentili, metriche server o definizione di `broken`, senza creare checklist parallele.

Deliverable Fase 5:

- [x] Migrazione Prisma netta con `PerformanceExperience` e, se scelto, `ServerPerformanceSample`, senza backfill o mapping da Web Vitals legacy.
- [x] Modulo server dedicato `observability-performance` con `schema`, `dto`, `policy`, `repository`, `service` e `index` separati.
- [x] Contratto collector batch per eventi `performance_metric`, con rifiuto di `web-vital` legacy e `FID`.
- [x] Client pubblico performance per `LCP`, `INP`, `CLS`, `FCP`, `TTFB`, integrato con sessione, privacy, bot filtering, rate limit e batching.
- [x] Service performance per normalizzazione, rating tecnico, qualità percepita, early exit, correlazione con engagement/errori e sample confidence.
- [x] Repository performance per persistenza e query CMS: summary, vitals, trend, worst pages, segmenti e dettaglio.
- [x] Procedure tRPC dedicate per summary, trend, worst pages e dettaglio performance.
- [x] DTO CMS con unità, soglie, sample count, confidence, breakdown metriche, qualità percepita e motivazioni.
- [x] UI CMS Performance basata su esperienza percepita, frizione, trend, worst pages e segmenti, non su Web Vitals grezzi isolati.
- [x] Test unitari, route test, client test, service/repository test, tRPC/DTO test e, dove possibile, test UI sui casi critici.

Deliverable prodotti:

- Migrazione `prisma/migrations/20260701120000_observability_performance_quality/migration.sql` con `PerformanceExperience` e nuova categoria `PERFORMANCE`, senza backfill o mapping legacy.
- Schema Prisma aggiornato in `prisma/schema.prisma` e client rigenerato in `lib/generated/prisma`.
- Modulo server `lib/server/modules/observability-performance/*` con `schema`, `dto`, `policy`, `repository`, `service` e `index`.
- Router tRPC dedicato `lib/server/trpc/routers/performance.ts` collegato al root router come `performance`.
- Collector `/api/telemetry` esteso al raw event batch-only `performance_metric`, con rifiuto di payload `web-vital` standalone e `FID`.
- Client pubblico `lib/telemetry/client.ts` esteso con raccolta best-effort di `LCP`, `INP`, `CLS`, `FCP`, `TTFB`, viewport e network context.
- `PerformanceExperience` aggrega metriche per `sessionId` + `pageInstanceId` + `path`, invece di creare una riga autorevole per ogni metrica isolata.
- Correlazione iniziale con `ContentEngagement` e `ErrorOccurrence` per `causedEarlyExit`, `broken`, `qualityReasons`, `hasBlockingError` e `correlatedErrorCount`.
- UI `/cms/performance` sostituita con dashboard qualitativa: KPI, vitals card, breakdown qualità percepita, trend LCP, worst pages, segmenti device/rete e motivazioni della pagina critica.
- Test aggiornati in `tests/unit/lib/server/modules/observability-performance/service.test.ts`, `tests/unit/lib/server/modules/telemetry/schema.test.ts`, `tests/unit/lib/server/modules/telemetry/service.test.ts`, `tests/unit/lib/telemetry/client.test.ts`, `tests/unit/app/api/telemetry/route.test.ts`, `tests/unit/lib/server/trpc/routers/performance.test.ts`.
- Test repository aggiunti in `tests/unit/lib/server/modules/observability-performance/repository.test.ts` per creazione e merge di episodi performance.
- Nessun framework browser UI dedicato è configurato nel progetto; la copertura UI Fase 5 resta nei test tRPC/DTO, client collector e rendering server type-safe della pagina CMS.

Criterio di completamento:

- [x] Una visita reale produce metriche `LCP`, `INP`, `CLS`, `FCP` e `TTFB` dentro il batch nuovo e popola `PerformanceExperience` collegata a sessione, path, pageType e contenuto quando disponibile.
- [x] La UI Performance dice quali esperienze sono `frustrating` o `broken` e perché, non solo quali metriche sono alte.
- [x] Ogni valore tecnico mostra unità, soglia, rating, sample count, confidence e contesto.
- [x] `FID`, payload `web-vital`, `WebVital`, performance summary legacy e aggregati tecnici provvisori non sono API ufficiali né fonti UI raggiungibili.
- [x] Performance poor senza impatto comportamentale resta segnale tecnico, mentre performance poor con bounce/exit precoce o errore correlato diventa frizione qualitativa.
- [x] `causedEarlyExit` viene derivato solo con evidenza sufficiente da performance + engagement/exit, non inventato da una singola metrica.
- [x] Sessioni bot sono escluse dagli output qualitativi di default.
- [x] Campioni piccoli o campionati sono marcati con affidabilità bassa o media e non producono classifiche aggressive.
- [x] Device, browser, connection, pageType, contenuto e release sono disponibili come dimensioni di diagnosi.
- [x] Il sistema resta funzionante e verificabile dopo la rimozione del legacy, anche se aggregati giornalieri, audit qualitativo e overview trasversale arrivano nelle fasi successive.

Verifiche eseguite:

- `pnpm prisma:generate`
- `pnpm prisma:validate`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:run tests/unit/lib/server/modules/observability-performance/service.test.ts tests/unit/lib/server/modules/observability-performance/repository.test.ts tests/unit/lib/server/modules/telemetry/schema.test.ts tests/unit/lib/server/modules/telemetry/service.test.ts tests/unit/lib/telemetry/client.test.ts tests/unit/app/api/telemetry/route.test.ts tests/unit/lib/server/trpc/routers/performance.test.ts`
- `pnpm test:run`
- Test completi: 60 file passati, 368 test passati.

### Fase 6: Audit Qualitativo

Obiettivo: trasformare audit da cronologia tecnica a timeline di responsabilità e rischio.

Assunzione operativa: la Fase 1, la Fase 2, la Fase 3, la Fase 4 e la Fase 5 sono state completate come descritte. Esistono quindi schema autorevole di osservabilità, collector batch/sessionizzato, bot filtering, rate limit, privacy gating, engagement contenuti, errori operativi autonomi e performance qualitativa. La Fase 6 non deve rifare telemetry, errori o performance: li usa per correlare request, errori e attività CMS.

Principio di questa fase: audit-responsibility-first, no retrocompatibilità. `AuditLog`, `AuditLogOutcome`, il modulo `audit-logs`, il router `auditLogs`, la pagina `/cms/audit-logs`, DTO basati su cronologia tecnica, middleware che conosce solo `action/resource/resourceId`, summary ricostruiti dallo stato corrente e test che proteggono il vecchio log non sono vincoli. Se codice, UI, query, prefetch, i18n o test continuano a parlare di audit log tecnico, si buttano via o si riscrivono. Non si mantengono alias tRPC, mapping da `AuditLog` a `AuditActivity`, backfill legacy, doppie pagine, colonne ponte o adapter compatibili.

Scelta dello slice interpretato: `AuditActivity` + `AuditChange`. `AuditActivity` è l'evento di responsabilità e contiene attore, azione, risorsa, outcome, rischio, impatto pubblico, request context e summary applicati o tentati. `AuditChange` contiene solo diff redatti di cambiamenti realmente applicati, quindi esiste solo per `outcome = SUCCESS` quando una mutazione persistita ha prodotto differenze.

Checklist operativa Fase 6:

- [x] Rimuovere dallo schema autorevole `AuditLog` e `AuditLogOutcome`, senza backfill, mapping legacy, viste compatibili o preservazione della cronologia tecnica provvisoria.
- [x] Rimuovere o sostituire `lib/audit-logs/*`, `lib/server/modules/audit-logs/*`, `lib/server/trpc/routers/audit-logs.ts`, export `auditLogs`, hook, prefetch, query parser, tipi `RouterInputs/RouterOutputs` e UI collegati al vecchio dominio.
- [x] Rimuovere o riscrivere la route CMS `/cms/audit-logs` e la navigazione corrispondente; se il prodotto mantiene una pagina audit, deve puntare al nuovo dominio qualitativo, non al vecchio log.
- [x] Rimuovere test, mock e aspettative basati su `AuditLog`, `auditLogsService.record`, `auditLogs.list`, `auditLogs.getById`, filtri solo per `outcome/resource`, summary risorsa ricostruiti dallo stato corrente o cronologia tecnica senza rischio.
- [x] Definire valori canonici audit riusabili: outcome `SUCCESS`/`FAILURE`, risk `low`/`medium`/`high`/`critical`, change type `created`/`updated`/`removed`/`reordered`, resource type iniziali `article`, `author`, `category`, `issue`, `media`, `navigation`, `page`, `tag`, `user`, `unknown`.
- [x] Definire azioni canoniche iniziali per le mutation CMS esistenti: `create`, `update`, `publish`, `unpublish`, `archive`, `delete`, `restore`, `reorder`, `sync_tags`, `upload`, `remove_media`, `update_navigation`, `change_role` e `unknown` solo come fallback esplicito.
- [x] Creare `AuditActivity` nello schema Prisma con campi: `id`, `actorId`, `actorSnapshot`, `action`, `resourceType`, `resourceId`, `resourceSnapshot`, `outcome`, `riskLevel`, `changedFields`, `beforeSummary`, `afterSummary`, `attemptedSummary`, `publicImpact`, `requestId`, `correlationId`, `reason`, `errorCode`, `errorMessage`, `metadata`, `createdAt`.
- [x] Creare `AuditChange` nello schema Prisma con campi: `id`, `auditActivityId`, `field`, `beforeValueRedacted`, `afterValueRedacted`, `changeType`, `createdAt`.
- [x] Collegare `AuditChange` a `AuditActivity` con delete cascade; nessuna `AuditChange` deve esistere per attività `FAILURE`.
- [x] Aggiungere indici minimi per audit: `createdAt`, `actorId/createdAt`, `resourceType/resourceId/createdAt`, `outcome/createdAt`, `riskLevel/createdAt`, `publicImpact/createdAt`, `requestId`, `correlationId` se presente.
- [x] Generare una migrazione Prisma netta che elimina le tabelle audit provvisorie e crea le nuove tabelle, senza colonne ponte, tabelle shadow, backfill da `audit_logs` o compatibilità con vecchi ID.
- [x] Creare modulo server dedicato `lib/server/modules/observability-audit/*` con `schema`, `dto`, `policy`, `repository`, `service`, `types` e `index` separati.
- [x] Aggiornare o spostare le funzioni pure in `lib/server/modules/observability/model/audit.ts` per includere derivazione rischio, impatto pubblico, change type, summary, redazione diff e validazione applied/attempted.
- [x] Non duplicare enum paralleli tra modello osservabilità e modulo audit: i valori canonici devono essere importati o riesportati da un solo punto autorevole.
- [x] Definire input service esplicito per registrare attività audit riuscite: attore, azione, risorsa, snapshot prima, snapshot dopo, contesto request, metadata redatti e motivo opzionale.
- [x] Definire input service esplicito per registrare attività audit fallite: attore, azione tentata, risorsa target, attempted summary, contesto request, errore redatto, metadata redatti e motivo opzionale.
- [x] Eliminare il contratto `record(entry)` che accetta un log tecnico già pronto; il service deve costruire `riskLevel`, `publicImpact`, `changedFields`, `AuditChange` e summary in modo deterministico.
- [x] Sostituire `lib/server/http/audit.ts` con helper qualitativi che raccolgono request context ammesso: method/path normalizzati se utili, `requestId`, `correlationId` quando disponibile, user-agent limitato solo se necessario, mai body request, cookie, Authorization header o token.
- [x] Aggiornare il middleware tRPC audit: non deve più ricevere solo `action/resource/resourceId`; deve supportare `captureBefore`, `captureAfter`, `buildAttemptedSummary`, `buildMetadata`, `buildReason` e `resolveResourceId` per mutation.
- [x] Garantire che il middleware catturi `beforeSummary` prima di `next()` per mutation su risorse esistenti, senza affidarsi allo stato finale per ricostruire il passato.
- [x] Garantire che il middleware catturi `afterSummary` dopo `SUCCESS` e calcoli diff applicati confrontando snapshot normalizzati, non input grezzo contro output parziale.
- [x] Garantire che su `FAILURE` venga registrato `attemptedSummary` e non `beforeSummary/afterSummary` come se esistesse una mutazione applicata.
- [x] Garantire che un fallimento su azione high/critical mantenga il rischio dell'azione tentata anche senza scrittura persistita.
- [x] Implementare fallback di persistenza audit redatto: se la scrittura su database fallisce, loggare internamente evento minimo con `persistence = "console-fallback"`, senza dati sensibili e senza rompere la mutation originale.
- [x] Implementare snapshot builder per `article`: id, titolo, slug, status, issue, category, author, isFeatured, publishedAt, presenza audio/media, tag count e flag pubblici utili; niente contenuto rich text completo.
- [x] Implementare snapshot builder per `page`: id, titolo, slug, status, publishedAt e flag pubblici; niente contenuto rich text completo.
- [x] Implementare snapshot builder per `issue`: id, titolo, slug, isActive, sortOrder, publishedAt, numero articoli collegati e flag pubblici.
- [x] Implementare snapshot builder per `author`, `category` e `tag`: id, nome, slug, isActive, conteggio contenuti collegati e indicazione se impattano contenuti pubblici.
- [x] Implementare snapshot builder per `navigation`: key, label, conteggio item, fingerprint redatto della struttura e flag di navigazione pubblica; niente dump illimitato di link o payload.
- [x] Implementare snapshot builder per `media`: pathname/url redatto, content type, size, public flag, uso noto su contenuti pubblici se disponibile.
- [x] Implementare snapshot builder per `user`: id, email redatta o limitata, role, emailVerified, name quando ammesso; niente sessioni, token o dati auth sensibili.
- [x] Definire summary leggibili per `beforeSummary`, `afterSummary` e `attemptedSummary` con shape stabile: title, description, fields redatti, public flags e valori necessari al diff.
- [x] Implementare diff builder per scalari semplici: title, slug, status, publishedAt, isFeatured, isActive, sortOrder, role, emailVerified e campi equivalenti.
- [x] Implementare diff builder per creazione: `changeType = "created"`, `beforeValueRedacted = null`, `afterValueRedacted` limitato ai campi summary ammessi.
- [x] Implementare diff builder per cancellazione: `changeType = "removed"`, `beforeValueRedacted` limitato ai campi summary ammessi, `afterValueRedacted = null`.
- [x] Implementare diff builder per reorder: salvare posizione/ordine precedente e successivo in forma compatta, non interi payload ordinati se grandi.
- [x] Implementare diff builder per liste e relazioni, ad esempio tag sync: aggiunti, rimossi, conteggi e nomi/id redatti limitati.
- [x] Implementare trattamento rich text e JSON complessi: non salvare payload completo; salvare summary come changed, length/hash non reversibile, block count o campi esplicitamente ammessi.
- [x] Implementare redazione centralizzata per diff, metadata, error message, actor/resource snapshot e attempted summary, riusando le regole privacy già definite: niente token, password, Authorization, cookie, body request, query sensibili o dati personali non necessari.
- [x] Imporre limiti di dimensione a snapshot, summary, metadata e valori diff; se un valore eccede i limiti, troncarlo o sostituirlo con summary redatto, non salvarlo integralmente.
- [x] Derivare `publicImpact` da stato risorsa e azione: contenuto pubblicato, publish/unpublish, delete pubblico, navigation pubblica, media pubblico/usato, taxonomy/autore collegati a contenuti pubblici.
- [x] Derivare `riskLevel = "critical"` per cambio ruolo, cancellazione utente/admin, azioni security-sensitive e azioni massive distruttive.
- [x] Derivare `riskLevel = "high"` per publish, unpublish, delete, media pubblico/usato, navigazione pubblica e modifiche a contenuti pubblici critici.
- [x] Derivare `riskLevel = "medium"` per modifiche a contenuti pubblicati non critiche, taxonomy o navigazione minore con impatto pubblico indiretto.
- [x] Derivare `riskLevel = "low"` per bozze, update metadati non pubblici e modifiche interne senza impatto pubblico.
- [x] Rendere risk e public impact spiegabili nei DTO con motivazioni sintetiche, non solo con enum.
- [x] Collegare audit a errori operativi tramite `requestId`, `correlationId` e finestra temporale, senza creare dipendenza circolare tra modulo audit e modulo errori; il dettaglio può leggere errori correlati tramite service/query dedicata.
- [x] Non bloccare errori o audit critici in base a bot filtering: audit CMS autenticato resta responsabilità operativa, non telemetry pubblica.
- [x] Implementare repository audit con metodi espliciti per record success, record failure, list activities, count activities, summary KPI, detail activity, list changes e lookup related errors se previsto.
- [x] Implementare service audit con business rules pure per snapshot, diff, redazione, risk, public impact, applied vs attempted, fallback e DTO.
- [x] Creare DTO CMS per summary audit con high/critical recenti, public impact recenti, failure sensibili, attori attivi, delete recenti e publish/unpublish recenti.
- [x] Creare DTO CMS per lista audit con `id`, actor display, action, resource type/id/title, outcome, riskLevel, riskReasons, publicImpact, changedFields, requestId, correlationId, errorCode e createdAt.
- [x] Creare DTO CMS per dettaglio audit con actor snapshot, resource snapshot, before/after/attempted summary, changes redatti, request context, errore redatto, metadata redatti e errori correlati.
- [x] Creare schema input tRPC per summary, list e detail con filtri: testo, actor, resource type, action, outcome, risk, public impact, date range, requestId, correlationId, sort e paginazione.
- [x] Creare router tRPC dedicato `observabilityAudit`, non procedure annidate in `telemetry`, con policy del modulo audit, service orchestration e `parseOutput` sui DTO.
- [x] Non hardcodare ruoli nelle procedure: usare `policy` del modulo audit. Se l'accesso resta admin-only, la decisione vive nella policy.
- [x] Aggiornare root router, prefetch CMS, tipi `RouterInputs`/`RouterOutputs`, query parser e hook per usare `observabilityAudit`, eliminando `auditLogs` come API raggiungibile.
- [x] Aggiornare tutte le mutation CMS esistenti per fornire al nuovo middleware audit informazioni sufficienti: articles, pages, issues, authors, categories, tags, navigation, media e users.
- [x] Per create, catturare attempted summary dall'input e after summary dal record creato; il diff deve rappresentare una creazione, non un update da oggetto vuoto generico.
- [x] Per update, catturare before dal repository prima della mutation e after dal record aggiornato o da lookup post-mutation.
- [x] Per publish/unpublish/archive, usare azioni specifiche invece di generico `update` quando il dominio le espone come mutation separate o comportamento semanticamente distinto.
- [x] Per delete, catturare before prima della cancellazione e non tentare di leggere la risorsa dopo hard delete per ricostruire il passato.
- [x] Per failure, registrare il tentativo anche quando `resourceId` non esiste o la risorsa non viene trovata, marcando chiaramente che il cambiamento non è stato applicato.
- [x] Sostituire la UI CMS audit con una timeline di responsabilità basata su `AuditActivity`, non con una tabella cronologica tecnica.
- [x] La UI deve aprire con KPI operativi: high/critical, public impact, failures, active actors e azioni sensibili recenti.
- [x] Implementare tabs o filtri rapidi: `Tutti`, `High risk`, `Falliti`, `Impatto pubblico`, `Azioni sensibili`.
- [x] Implementare lista/timeline ordinata per rischio e recenza, con badge risk/outcome/public impact/resource e copy button per ID tecnici rilevanti.
- [x] Implementare filtri UI sempre raggiungibili per actor, resource type, action, risk, outcome, public impact, date range e testo.
- [x] Implementare dettaglio in `Sheet` o `Dialog` con evento, attore, risorsa, request context, diff applicato per success, attempted summary per failure, errore e metadata redatti.
- [x] Mostrare per ogni attività perché è rischiosa: risk reasons, public impact, outcome, tipo risorsa e campi cambiati devono essere leggibili senza aprire JSON grezzo.
- [x] Per attività `SUCCESS`, mostrare `AuditChange` come diff applicato; per attività `FAILURE`, mostrare il tentativo marcato come non applicato e non mostrare una sezione diff applicato vuota o fuorviante.
- [x] Aggiungere link alla risorsa CMS quando esiste ancora; per risorsa cancellata, mostrare snapshot catturato e stato mancante senza lookup fragile.
- [x] Aggiungere copy button per `auditActivityId`, `requestId`, `correlationId`, `resourceId` e, se presenti, ID errori correlati.
- [x] Aggiornare testi i18n CMS da “Audit log” a “Audit” o “Timeline audit”, con copy che spiega rischio, impatto pubblico, tentativi falliti e diff applicati.
- [x] Aggiungere empty state che spiega che l'audit si popola quando le mutation CMS registrano attività riuscite o fallite con contesto qualitativo.
- [x] Non mostrare IP address o user-agent come dati primari UI; se conservati per debug, devono essere redatti/limitati e subordinati al request context.
- [x] Aggiungere test unitari per risk derivato: publish/unpublish/delete pubblico high, cambio ruolo critical, bozza low/medium, failure high/critical che resta high/critical.
- [x] Aggiungere test unitari per public impact su article/page/issue/navigation/media/taxonomy/user e casi senza impatto pubblico.
- [x] Aggiungere test unitari per snapshot builder, summary builder e limiti di dimensione su ogni resource type supportato.
- [x] Aggiungere test unitari per diff redatto: create, update, remove, reorder, tag sync, rich text summary e valori sensibili rimossi.
- [x] Aggiungere test unitari per applied vs attempted: success produce before/after/change, failure produce attempted/error e zero changes.
- [x] Aggiungere test service/repository per record success, record failure, fallback storage failure redatto, lista, summary, dettaglio e paginazione.
- [x] Aggiungere test middleware per mutation riuscita, mutation fallita, capture before mancante, delete con hard delete, create senza before e failure prima della persistenza.
- [x] Aggiungere test tRPC/DTO per summary, list, detail, filtri, sort, paginazione e output validation con `parseOutput`.
- [x] Aggiungere test di correlazione audit/errori via `requestId` o `correlationId`, senza accoppiare direttamente i due moduli in modo ciclico.
- [x] Aggiungere test UI essenziali per KPI, filtri, badge rischio, dettaglio success con diff, dettaglio failure con attempted summary, empty state e copy values se l'infrastruttura test UI lo consente.
- [x] Verificare con `prisma validate`, generazione client, typecheck, lint, unit test pertinenti e test completi se il tempo di esecuzione lo consente.
- [x] Aggiornare questo documento se durante l'implementazione emergono decisioni su shape snapshot, redazione diff, risk reasons, correlationId o UI detail, senza creare checklist parallele.

Deliverable Fase 6:

- [x] Migrazione Prisma netta con `AuditActivity` e `AuditChange`, e rimozione di `AuditLog`/`AuditLogOutcome`, senza backfill o mapping legacy.
- [x] Modulo server dedicato `observability-audit` con `schema`, `dto`, `policy`, `repository`, `service`, `types` e `index` separati.
- [x] Builder deterministici per snapshot, summary, diff redatti, risk level, public impact, risk reasons e distinzione applied vs attempted.
- [x] Middleware/helper audit qualitativo che cattura before, after e attempted summary dalle mutation CMS.
- [x] Procedure tRPC dedicate per summary, list e detail audit.
- [x] DTO CMS con rischio, motivazioni, impatto pubblico, diff redatti, attempted summary, request context ed errori correlati.
- [x] UI CMS audit come timeline di responsabilità, non tabella tecnica di log.
- [x] Tutte le mutation CMS rilevanti cablate al nuovo audit qualitativo.
- [x] Test unitari, middleware test, service/repository test, tRPC/DTO test e, dove possibile, test UI sui casi critici.

Criterio di completamento:

- [x] Una creazione riuscita registra `AuditActivity` con actor snapshot, resource snapshot, `afterSummary`, risk/publicImpact e `AuditChange` di tipo `created`.
- [x] Un update riuscito registra `beforeSummary`, `afterSummary`, `changedFields` e diff redatti dei soli campi realmente applicati.
- [x] Una cancellazione riuscita conserva snapshot e summary della risorsa prima dell'hard delete, senza lookup postumo fragile.
- [x] Un publish/unpublish/delete pubblico emerge come high risk e public impact senza ricerca manuale.
- [x] Un cambio ruolo o azione admin sensibile emerge come critical.
- [x] Un fallimento su azione high/critical registra `attemptedSummary`, errore redatto e rischio dell'azione tentata, senza `AuditChange` applicati.
- [x] Un admin distingue immediatamente azione riuscita, tentativo fallito, rischio, impatto pubblico, attore, risorsa, request e campi cambiati.
- [x] Il dettaglio audit mostra diff leggibili e redatti, non JSON grezzo invasivo o stato corrente ricostruito a posteriori.
- [x] Audit e errori operativi sono correlabili tramite `requestId`/`correlationId` quando disponibili.
- [x] `AuditLog`, `auditLogs`, `/cms/audit-logs`, DTO/test legacy e middleware action/resource-only non sono API ufficiali né codice raggiungibile.
- [x] Il sistema resta funzionante e verificabile dopo la rimozione del legacy, anche se aggregati giornalieri, overview trasversale e insight arrivano nelle fasi successive.

Verifiche eseguite:

- `pnpm prisma generate`
- `pnpm prisma validate`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:run tests/unit/lib/server/modules/observability-audit/service.test.ts`
- `pnpm test:run`
- `pnpm build`

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
