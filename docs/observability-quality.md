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

Assunzione operativa: la Fase 1, la Fase 2, la Fase 3, la Fase 4, la Fase 5 e la Fase 6 sono state completate come descritte. Esistono quindi schema autorevole di osservabilità, collector batch/sessionizzato, session tracking, bot filtering, rate limit, privacy gating, engagement contenuti, audio engagement, errori operativi autonomi, performance qualitativa e audit qualitativo. La Fase 7 non deve ridefinire questi domini: li usa come fonti interpretate autorevoli per costruire dashboard storiche veloci.

Principio di questa fase: aggregates-first, no retrocompatibilità. `TelemetryDailyAggregate`, `WebVitalDailyAggregate`, script legacy su `analytics_events`, `web_vitals`, `error_logs`, `audit_logs`, job provvisori di refresh/prune, summary runtime basati su raw event, DTO storici views-based, comandi `audit:prune` e documentazione ops che cita vecchie tabelle non sono vincoli. Se codice, script, package command, README, test o UI continuano a dipendere da aggregati provvisori o da tabelle eliminate, si buttano via o si riscrivono. Non si mantengono alias, adapter, backfill, colonne ponte, script compatibili, mapping vecchio-nuovo o doppie pipeline per proteggere dati provvisori.

Scelta dello slice aggregato: aggregati giornalieri persistenti per contenuti, errori, performance e audit, più registro job. Gli aggregati leggono dalle tabelle interpretate (`ContentEngagement`, `AudioEngagement`, `PerformanceExperience`, `ErrorGroup`, `ErrorOccurrence`, `AuditActivity`, `AuditChange`) e non dai raw event come fonte primaria. `ObservabilityEvent` resta utile per debug e ricostruzione recente, ma le dashboard storiche non devono dipendere dai raw dopo la retention.

Modelli introdotti in questa fase:

- `DailyContentQualityAggregate`
- `DailyErrorAggregate`
- `DailyPerformanceAggregate`
- `DailyAuditAggregate`
- `ObservabilityJobRun`

Checklist operativa Fase 7:

- [x] Rimuovere o sostituire ogni residuo legacy di job e retention: script che puntano a `audit_logs`, `analytics_events`, `web_vitals`, `error_logs`, `TelemetryDailyAggregate`, `WebVitalDailyAggregate` o nomi equivalenti non più autorevoli.
- [x] Rimuovere da `package.json` comandi legacy come `audit:prune` se puntano al vecchio dominio, sostituendoli con comandi osservabilità nuovi e senza alias compatibili.
- [x] Aggiornare `README.md`, `scripts/README.md` e documentazione operativa che cita vecchie tabelle o vecchi job, eliminando istruzioni non eseguibili invece di marcarle come legacy supportato.
- [x] Creare `DailyContentQualityAggregate` nello schema Prisma con dimensioni minime: `date`, `pageType`, `contentType`, `contentId`, `path` e campi qualitativi derivati.
- [x] Inserire in `DailyContentQualityAggregate` almeno: `totalVisits`, `qualifiedVisits`, `completedReads`, `significantReturns`, `recurringContentDays`, `averageActiveTimeMs`, `frustrationSignals`, `errorImpactedSessions`, `poorPerformanceSessions`, `qualityScore`, `qualityScoreComponents`, `sampleConfidence`, `thresholdVersion`, `createdAt`, `updatedAt`.
- [x] Definire chiave unica per `DailyContentQualityAggregate` sulla granularità scelta, ad esempio `date` + `pageType` + `contentType` + `contentId` + `path`, normalizzando i null in modo deterministico senza colonne ponte legacy.
- [x] Creare `DailyErrorAggregate` con dimensioni minime: `date`, `source`, `severity`, `status`, `impactArea`, `userImpact`, `release`.
- [x] Inserire in `DailyErrorAggregate` almeno: `newGroups`, `openGroups`, `criticalHighGroups`, `regressions`, `occurrences`, `affectedSessions`, `blockedActionGroups`, `priorityScoreAverage`, `createdAt`, `updatedAt`.
- [x] Creare `DailyPerformanceAggregate` con dimensioni minime: `date`, `pageType`, `path`, `contentId`, `deviceType`, `release`.
- [x] Inserire in `DailyPerformanceAggregate` almeno: `totalExperiences`, `smoothCount`, `acceptableCount`, `frustratingCount`, `brokenCount`, `earlyExitCount`, `lcpP75`, `inpP75`, `clsP75`, `fcpP75`, `ttfbP75`, `poorRate`, `sampleConfidence`, `thresholdVersion`, `createdAt`, `updatedAt`.
- [x] Creare `DailyAuditAggregate` con dimensioni minime: `date`, `resourceType`, `action`, `outcome`, `riskLevel`, `publicImpact`.
- [x] Inserire in `DailyAuditAggregate` almeno: `activityCount`, `highCriticalCount`, `failureCount`, `sensitiveActionCount`, `activeActorCount`, `createdAt`, `updatedAt`.
- [x] Creare `ObservabilityJobRun` con `id`, `jobName`, `windowStart`, `windowEnd`, `status`, `startedAt`, `finishedAt`, `lockedUntil`, `processedRows`, `errorMessage`, `metadata`, `createdAt`, `updatedAt`.
- [x] Aggiungere indici minimi per dashboard: date range, dimensioni principali, `qualityScore`, `sampleConfidence`, severity/status, perceived quality counts, risk/outcome e lookup job per `jobName`/`status`/`lockedUntil`.
- [x] Generare una migrazione Prisma netta con le nuove tabelle aggregate e il registro job, senza backfill da aggregati provvisori, viste compatibili, colonne shadow o mapping da tabelle eliminate.
- [x] Creare modulo server dedicato `lib/server/modules/observability-aggregates/*` con `schema`, `dto`, `policy`, `repository`, `service` e `index` separati.
- [x] Definire schema Zod per input job: `from`, `to`, `days`, `domains`, `force`, `dryRun` se utile, con validazione di finestra temporale e limiti massimi ragionevoli.
- [x] Definire schema Zod per query aggregate CMS: periodo, dominio, `pageType`, `contentType`, `contentId`, `path`, `deviceType`, `release`, severity/status/risk/outcome e paginazione dove serve.
- [x] Implementare repository aggregati con metodi espliciti per acquisire lock, registrare job start, marcare success/failure, cancellare finestra aggregata, inserire batch aggregate e leggere aggregati per dashboard.
- [x] Implementare lock job contro race delete/reinsert usando `ObservabilityJobRun` o lock DB equivalente; due job sulla stessa finestra e dominio non devono riscrivere contemporaneamente gli stessi aggregati.
- [x] Garantire che lock scaduti possano essere recuperati in modo deterministico, senza lasciare job bloccati per sempre dopo crash o deploy interrotto.
- [x] Implementare service aggregati con funzioni pure per costruire finestre giornaliere UTC, raggruppare dimensioni, calcolare conteggi pesati, sample confidence, quality score e componenti.
- [x] Rendere i job idempotenti: rilanciare lo stesso job sulla stessa finestra deve produrre gli stessi aggregati senza duplicati.
- [x] Implementare strategia replace-window: per ogni dominio e giorno della finestra si cancellano gli aggregati esistenti e si reinseriscono quelli ricostruiti dentro una transazione o sequenza protetta da lock.
- [x] Non leggere `ObservabilityEvent` come fonte primaria degli aggregati qualitativi, salvo controlli diagnostici espliciti; contenuti, performance, errori e audit derivano dalle tabelle interpretate delle fasi precedenti.
- [x] Escludere di default dagli aggregati qualitativi le sessioni `isLikelyBot = true`, mantenendo eventuale conteggio diagnostico separato solo se serve e senza contaminarlo con KPI primari.
- [x] Calcolare `totalVisits` da `ContentEngagement`, non da page view legacy o raw `page_enter` trattati come views.
- [x] Calcolare `qualifiedVisits` da engagement `engaged` e `completed`, con regole coerenti con Fase 3 e senza reintrodurre views come metrica primaria.
- [x] Calcolare `completedReads` da `ContentEngagement.completed` e, per contenuti audio/listen, integrare `AudioEngagement.completed` senza doppio conteggio della stessa sessione/contenuto.
- [x] Calcolare `significantReturns` da `returnCountInSession` e refresh/return rules della Fase 3, distinguendolo da refresh tecnico.
- [x] Calcolare `recurringContentDays` a livello contenuto su più giorni, senza tracking per-visitatore cross-day e senza introdurre identificatori persistenti.
- [x] Calcolare `averageActiveTimeMs` con media coerente con `sampleRate`, evitando media ingenua quando gli episodi campionati non sono rappresentativi.
- [x] Calcolare `poorPerformanceSessions` e `frustrationSignals` correlando `PerformanceExperience` alla dimensione contenuto/path/giorno, usando `perceivedQuality`, `causedEarlyExit` e sessione.
- [x] Calcolare `errorImpactedSessions` correlando `ErrorOccurrence`/`ErrorGroup` con contenuto/path/sessione/giorno, escludendo gruppi `ignored` salvo decisione esplicita codificata.
- [x] Implementare quality score contenuto con la formula di Fase 0: `completionRate`, `qualifiedRatio`, `returnRate`, `activeTimeFit`, `perfPenalty`, `errorPenalty` e pesi iniziali versionati.
- [x] Salvare sempre `qualityScoreComponents` insieme a `qualityScore`, includendo valori normalizzati, pesi usati, penalità, `thresholdVersion` e motivi principali leggibili dalla UI.
- [x] Gestire denominatori zero in modo deterministico: score nullo o non classificabile con `sampleConfidence = low`, non divisioni false o fallback ottimistici.
- [x] Calcolare `sampleConfidence` per contenuti in base a volume, distribuzione temporale e sample rate medio, evitando classifiche aggressive su pochi episodi.
- [x] Calcolare aggregati errori distinguendo nuovi gruppi, gruppi aperti, critical/high, regressioni, occorrenze, sessioni impattate e azioni bloccate, senza usare solo `occurrenceCount` come priorità.
- [x] Calcolare aggregati errori da `ErrorGroup` e `ErrorOccurrence` in modo coerente: stato operativo dal gruppo, volume e sessioni dalla occorrenze nella finestra.
- [x] Calcolare aggregati performance con breakdown `smooth`/`acceptable`/`frustrating`/`broken`, `poorRate`, early exits e p75 per `LCP`, `INP`, `CLS`, `FCP`, `TTFB`.
- [x] Non reintrodurre `FID` negli aggregati performance; se compare in dati invalidi, resta ignorato/rifiutato dal collector delle fasi precedenti e non ha colonna aggregata.
- [x] Calcolare percentili performance in modo metodologicamente onesto: p75 sui campioni osservati con confidence esplicita oppure struttura sample-rate-aware dedicata; non dichiarare precisione falsa.
- [x] Calcolare aggregati audit da `AuditActivity`: high/critical, failure, public impact, sensitive actions, active actor distinct e breakdown per resource/action/outcome/risk.
- [x] Non aggregare `AuditChange` come fonte primaria dei KPI audit; usarlo solo per conteggi secondari sui campi cambiati se serve e solo da cambiamenti applicati `SUCCESS`.
- [x] Definire granularità massima delle dimensioni aggregate per evitare cardinalità esplosiva: path normalizzati e limitati, contentId quando disponibile, bucket `unknown` esplicito per dimensioni assenti.
- [x] Implementare pruning raw/interpreted coerente con retention: raw breve, episodi interpretati media, aggregati lunga, audit più conservativo; nessuna retention deve cancellare la storia aggregata necessaria alle dashboard.
- [x] Creare script `scripts/aggregate-observability.mjs` per eseguire aggregation da CLI con finestra configurabile e default sicuro.
- [x] Creare script `scripts/prune-observability.mjs` per cancellare dati raw/interpreted oltre retention senza toccare aggregati storici non scaduti.
- [x] Creare script `scripts/observability-jobs.mjs` che esegue aggregate + prune nella sequenza operativa prevista.
- [x] Aggiungere comandi `observability:aggregate`, `observability:prune` e `observability:jobs` a `package.json`, rimuovendo comandi legacy equivalenti.
- [x] Definire variabili ambiente nuove e coerenti: giorni finestra aggregazione, retention raw, retention episodi interpretati, retention error occurrences, retention aggregati e timeout lock job.
- [x] Aggiornare documentazione comandi in `README.md` e `scripts/README.md` con i nuovi script, variabili env e semantica di retention.
- [x] Aggiornare repository/service di telemetry CMS perché summary e trend leggano gli aggregati quando il periodo è coperto da aggregati, non query pesanti su `ContentEngagement`.
- [x] Mantenere detail operativi recenti su `ContentEngagement`/`AudioEngagement` quando servono drilldown, senza usare raw event o views legacy.
- [x] Aggiornare repository/service performance CMS perché summary, trend e worst pages leggano `DailyPerformanceAggregate` dove possibile, lasciando `PerformanceExperience` per dettagli recenti e diagnosi puntuale.
- [x] Aggiornare summary errori CMS per usare `DailyErrorAggregate` sui KPI storici, mantenendo inbox operativa e dettaglio su `ErrorGroup`/`ErrorOccurrence`.
- [x] Aggiornare summary audit CMS per usare `DailyAuditAggregate` sui KPI storici, mantenendo timeline e dettaglio su `AuditActivity`/`AuditChange`.
- [x] Non modificare il significato delle procedure tRPC esistenti in modo silenzioso se il contratto cambia; creare procedure aggregate esplicite o aggiornare DTO mantenendo nomi coerenti col nuovo significato.
- [x] Creare DTO CMS per aggregati contenuto con score, componenti, confidence, periodo e dimensioni filtrabili.
- [x] Creare DTO CMS per aggregati performance con breakdown qualità percepita, p75, poor rate, early exit, confidence e release/device/pageType.
- [x] Creare DTO CMS per aggregati errori con nuovi/aperti/regressioni/critical-high/sessioni impattate/blocked actions e trend giornaliero.
- [x] Creare DTO CMS per aggregati audit con high risk, failures, public impact, sensitive actions, active actors e breakdown per resource/action.
- [x] Creare router o procedure tRPC dedicate agli aggregati se necessario, usando policy del modulo e `parseOutput`; niente business logic nei router.
- [x] Non hardcodare ruoli nelle procedure aggregate: usare policy del modulo aggregati o policy dei domini osservabilità già definiti.
- [x] Aggiungere test unitari per costruzione finestre UTC, inclusi boundary di giorno, timezone locale irrilevante e range multi-giorno.
- [x] Aggiungere test service per idempotenza aggregation: due run sulla stessa finestra producono una sola serie di righe aggregate coerenti.
- [x] Aggiungere test repository per lock job, lock già acquisito, lock scaduto, job success, job failure e metadata errore redatto.
- [x] Aggiungere test per replace-window: aggregati esistenti nella finestra vengono sostituiti, aggregati fuori finestra restano intatti.
- [x] Aggiungere test per quality score contenuto: componenti, pesi, clamp, denominatori zero, penalty performance/errori e `sampleConfidence`.
- [x] Aggiungere test per sample-rate-aware counts: heartbeat/scroll o episodi campionati pesano correttamente e non alterano eventi critici non campionati.
- [x] Aggiungere test aggregati contenuto per qualified visits, completed reads, returns, recurring content days, bot exclusion e audio completion senza doppio conteggio.
- [x] Aggiungere test aggregati performance per p75, breakdown qualità percepita, poor rate, early exit, release/device/pageType e assenza `FID`.
- [x] Aggiungere test aggregati errori per nuovi gruppi, aperti, critical/high, regressioni, sessioni distinte impattate, ignored esclusi dove previsto e blocked actions.
- [x] Aggiungere test aggregati audit per high/critical, failure, public impact, sensitive actions, active actor distinct e breakdown per risorsa/azione.
- [x] Aggiungere test prune per retention raw/interpreted/aggregati: la cancellazione non rompe metriche storiche e non tocca righe fuori policy.
- [x] Aggiungere test script o smoke test dei comandi CLI dove l'infrastruttura test del progetto lo consente, verificando env mancanti, input invalidi e dry run se implementato.
- [x] Aggiornare test tRPC/DTO per confermare che summary/trend storici leggono aggregati e che detail operativi restano sulle tabelle vive corrette.
- [x] Verificare con `prisma validate`, generazione client, typecheck, lint, unit test pertinenti, test completi e build se il tempo di esecuzione lo consente.
- [x] Aggiornare questo documento se durante l'implementazione emergono decisioni su granularità aggregati, retention, lock, p75 campionati o quality score, senza creare checklist parallele.

Deliverable Fase 7:

- [x] Migrazione Prisma netta con `DailyContentQualityAggregate`, `DailyErrorAggregate`, `DailyPerformanceAggregate`, `DailyAuditAggregate` e `ObservabilityJobRun`, senza backfill o mapping da aggregati legacy.
- [x] Modulo server dedicato `observability-aggregates` con `schema`, `dto`, `policy`, `repository`, `service` e `index` separati.
- [x] Service aggregation idempotente per contenuti, performance, errori e audit, basato sulle tabelle interpretate delle fasi precedenti.
- [x] Quality score giornaliero per contenuto salvato con componenti, pesi, penalità, threshold version e sample confidence.
- [x] Lock job e registro esecuzioni con success/failure, finestre processate, righe elaborate e recupero lock scaduti.
- [x] Script `aggregate-observability`, `prune-observability` e `observability-jobs` con comandi `package.json` nuovi.
- [x] Retention raw/interpreted/aggregati documentata e implementata senza rompere dashboard storiche.
- [x] Summary/trend CMS spostati su aggregati persistenti dove appropriato, mantenendo detail operativi sulle tabelle vive.
- [x] Rimozione di script, comandi, documentazione, test e import legacy relativi a vecchie tabelle o vecchi aggregati.
- [x] Test unitari, repository test, service test, prune test, tRPC/DTO test e, dove possibile, smoke test CLI sui casi critici.

Criterio di completamento:

- [x] Rilanciare lo stesso job sulla stessa finestra non duplica righe e produce output stabile.
- [x] Due job concorrenti sulla stessa finestra non possono cancellare/reinserire aggregati in race.
- [x] Le dashboard storiche leggono aggregati persistenti e non dipendono da query pesanti su raw event o episodi oltre la retention prevista.
- [x] La retention può cancellare raw event e dati interpretati scaduti senza rompere quality score, trend storici, KPI errori, KPI performance o KPI audit già aggregati.
- [x] `DailyContentQualityAggregate` mostra quality score spiegabile con componenti, sample confidence e threshold version.
- [x] Gli aggregati contenuto misurano letture qualificate, completamenti, ritorni e frizione, non page views legacy.
- [x] Gli aggregati performance distinguono esperienza percepita, early exit, p75 e confidence, senza reintrodurre `FID` o Web Vitals standalone legacy.
- [x] Gli aggregati errori distinguono nuovi, aperti, critical/high, regressioni e sessioni impattate, senza ridurre la priorità a `occurrenceCount` grezzo.
- [x] Gli aggregati audit distinguono rischio, fallimenti, impatto pubblico, azioni sensibili e attori attivi, senza ricostruire la storia da stato corrente.
- [x] Gli aggregati sono sample-rate-aware dove il dato è campionato e marcano confidence bassa quando l'evidenza è insufficiente.
- [x] Sessioni bot sono escluse dagli aggregati qualitativi di default.
- [x] Script, comandi e documentazione legacy incompatibili sono eliminati o riscritti, non mantenuti per compatibilità preventiva.
- [x] Il sistema resta funzionante e verificabile dopo la rimozione del legacy, anche se overview trasversale e insight avanzati arrivano nelle fasi successive.

Verifiche eseguite:

- `pnpm prisma:generate`
- `pnpm prisma:validate`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:run tests/unit/lib/server/modules/observability-aggregates/*`
- `pnpm test:run`
- `pnpm build`

### Fase 8: UI CMS Con Shadcn Charts

Obiettivo: interfaccia coerente col CMS ma più efficace delle tabelle attuali.

Assunzione operativa: la Fase 1, la Fase 2, la Fase 3, la Fase 4, la Fase 5, la Fase 6 e la Fase 7 sono state completate come descritte. Esistono quindi schema autorevole, collector qualitativo, session tracking, bot filtering, rate limit, engagement contenuti, errori operativi, performance qualitativa, audit qualitativo, aggregati giornalieri persistenti e job idempotenti. La Fase 8 non deve ricostruire significati, metriche o aggregati: li rende leggibili e investigabili nella UI CMS.

Principio di questa fase: observability-ui-first, no retrocompatibilità. Pagine, componenti, copy, prefetch, query parser, loading state, test o route nate per il modello provvisorio non sono vincoli. `Analytics` come concetto di page-view dashboard, route `/cms/analytics`, componenti inline KPI/tabella, copy basato su views, detail dialog duplicati, copy button locali, badge mapping duplicati e schermate placeholder vanno eliminati o riscritti. Non si mantengono redirect legacy, alias di navigazione, doppie dashboard, wrapper compatibili, vecchi nomi per nuove metriche o fallback verso query non aggregate per proteggere codice provvisorio.

Pagine CMS autorevoli dopo questa fase:

- `/cms/observability` overview complessiva.
- `/cms/telemetry` dashboard editoriale di engagement e qualità contenuti.
- `/cms/performance` dashboard di esperienza percepita.
- `/cms/errors` inbox operativa errori.
- `/cms/audit` timeline di responsabilità.

Ordine UI consigliato nella navigazione osservabilità: overview, errors, performance, telemetry, audit. Errors resta prima delle altre pagine operative perché ha valore immediato; telemetry segue quando engagement e aggregati sono popolati; audit chiude la sequenza perché richiede lettura di diff, rischio e responsabilità.

Checklist operativa Fase 8:

- [x] Rimuovere `/cms/analytics` come route ufficiale e sostituirla con `/cms/telemetry`, senza redirect o alias compatibile se non esiste un requisito prodotto esplicito.
- [x] Aggiornare navigazione CMS, i18n, metadata, titoli pagina e copy da `Analytics` a `Telemetry` o `Osservabilità`, eliminando riferimenti a page views come metrica primaria.
- [x] Aggiungere `/cms/observability` come overview dedicata, senza trasformare implicitamente `/cms` in dashboard osservabilità se il CMS index resta orientato al flusso editoriale.
- [x] Aggiornare `cmsNavigation` e visibilità per ruolo usando le policy dei moduli osservabilità già definite, senza hardcodare nuovi ruoli nei componenti UI.
- [x] Rimuovere schermate, import, prefetch, query parser, test e copy ancora collegati alla vecchia pagina analytics o a metriche views-based, invece di lasciarli come legacy non raggiungibile.
- [x] Introdurre la dipendenza chart scelta, ad esempio `recharts`, solo se non già presente, e aggiungere il componente shadcn `ChartContainer`/`ChartTooltip`/`ChartLegend` o equivalente coerente col progetto.
- [x] Non creare grafici custom fragili se i componenti shadcn/recharts coprono il caso; la personalizzazione deve stare in wrapper CMS, non in fork locali della libreria.
- [x] Creare modulo UI condiviso `features/cms/observability/components/*` o percorso equivalente con responsabilità chiara e senza mischiare business rules server.
- [x] Creare `ObservabilityMetricCard` basato su `Card`, con label, valore, unità, descrizione, trend opzionale, confidence opzionale e stato qualitativo.
- [x] Creare `ObservabilityStatusBadge` basato su `Badge`, con mapping unico per severity errori, status errori, risk audit, outcome audit, quality/perceived quality, engagement level e sample confidence.
- [x] Creare `ObservabilityChartCard` con titolo, domanda implicita, descrizione, `ChartContainer`, legenda/tooltip coerenti, empty state e sample confidence visibile.
- [x] Creare `ObservabilityFilterSheet` con `Sheet`, `Select`, input testo e date range/periodo, riusando pattern CMS esistenti invece di duplicare toolbar per ogni pagina.
- [x] Creare `ObservabilityDetailDrawer` per drilldown lungo, preferendo `Sheet` a `Dialog` quando il dettaglio contiene timeline, diff, stack, metriche e ID tecnici.
- [x] Riutilizzare `CopyTechnicalValueButton` globale per `requestId`, `correlationId`, `sessionId`, `fingerprint`, `auditActivityId`, `errorGroupId`, `contentId` e `pageInstanceId`, rimuovendo copy button locali duplicati.
- [x] Creare `QualityScoreBreakdown` che mostra score, componenti normalizzate, pesi, penalità, threshold version, sample confidence e motivi principali leggibili.
- [x] Creare `SampleConfidenceBadge` o integrare la confidence nello status badge, evitando che score o classifiche con campione basso appaiano autorevoli.
- [x] Creare empty state osservabilità distinti per: nessun dato raccolto, aggregati non ancora generati, filtri troppo stretti, campione insufficiente e permessi mancanti.
- [x] Definire palette e token visuali per osservabilità usando il sistema CMS esistente: severa, editoriale, alto contrasto, senza colori decorativi slegati da severità/qualità/rischio.
- [x] Usare grafici solo quando chiariscono andamento, distribuzione o correlazione; non usare chart come decorazione se una card o tabella spiega meglio il dato.
- [x] Garantire che ogni card risponda a una domanda operativa esplicita, ad esempio “cosa è peggiorato?”, “cosa blocca utenti/editor?”, “quali contenuti valgono davvero?”.
- [x] Garantire che ogni score mostrato abbia breakdown o link immediato al breakdown; nessun numero qualitativo deve apparire come autorità opaca.
- [x] Collegare `/cms/observability` a `observabilityAggregates.overview` o procedura overview equivalente basata sugli aggregati Fase 7, non a query raw o runtime pesanti.
- [x] La overview deve mostrare KPI globali: quality score contenuti, letture qualificate, completamenti, errori critical/high aperti, esperienze frustrating/broken, audit high/critical recenti e sample confidence.
- [x] La overview deve mostrare una sezione “Cosa guardare prima” ordinata per impatto operativo: regressioni/errori critical, performance frustrante, contenuti con qualità anomala, audit failure sensibili.
- [x] La overview deve includere grafici sintetici: trend qualità contenuti, breakdown perceived quality, errori per severity/status, audit per risk/outcome, usando aggregati giornalieri.
- [x] La overview deve avere deep link verso `/cms/errors`, `/cms/performance`, `/cms/telemetry` e `/cms/audit` con filtri coerenti quando possibile.
- [x] Non introdurre insight avanzati non ancora definiti dalla Fase 9; la overview Fase 8 aggrega e priorizza, ma non deve inventare correlazioni non progettate.
- [x] Rifare `/cms/telemetry` come pagina di qualità editoriale, non come analytics generico.
- [x] `/cms/telemetry` deve leggere aggregati Fase 7 per summary/trend storici e usare `ContentEngagement`/`AudioEngagement` solo per dettaglio operativo recente quando serve.
- [x] `/cms/telemetry` deve mostrare KPI primari: letture qualificate, completamenti, completion rate, ritorni significativi, tempo attivo medio, quality score e sample confidence.
- [x] `/cms/telemetry` deve includere `QualityScoreBreakdown` per contenuto o aggregato quando viene mostrato `qualityScore`.
- [x] `/cms/telemetry` deve includere trend engagement con `AreaChart` o `LineChart`, breakdown engagement con `BarChart`, top contenuti per quality score e tabella contenuti filtrabile.
- [x] `/cms/telemetry` deve mostrare contenuti “aperti ma poco letti” solo se calcolati da episodi/aggregati qualitativi, non da page views legacy.
- [x] `/cms/telemetry` deve distinguere ritorni significativi da refresh tecnici e spiegare la confidence dei dati con copy breve.
- [x] `/cms/telemetry` deve avere detail drawer per contenuto con breakdown `glance`/`scan`/`engaged`/`completed`, active time, scroll/audio, returns, refresh, exit type e technical IDs.
- [x] Non mostrare `views` come metrica primaria in `/cms/telemetry`; se serve volume diagnostico, usare nomi coerenti come `episodi`, `sessioni con contenuto` o `total visits` da `ContentEngagement`/aggregati.
- [x] Rifare `/cms/performance` su componenti condivisi e chart reali, eliminando KPI/card/table inline duplicati.
- [x] `/cms/performance` deve leggere aggregati Fase 7 per storico e `PerformanceExperience` solo per dettaglio recente o diagnosi puntuale.
- [x] `/cms/performance` deve aprire con diagnosi qualitativa: esperienze frustrating/broken, early exits, poor rate, pagine peggiori per impatto e sample confidence.
- [x] `/cms/performance` deve mostrare cards per `LCP`, `INP`, `CLS`, `FCP`, `TTFB` con p75, unità, soglie, rating e sample count.
- [x] `/cms/performance` non deve mostrare `FID` in nessun punto: né label, né colonna, né test, né fallback.
- [x] `/cms/performance` deve includere trend p75 con `LineChart`, breakdown perceived quality, worst pages ordinate per impatto qualitativo e segmenti device/browser/connection.
- [x] `/cms/performance` deve avere detail drawer pagina con metriche, soglie, release, device/rete, engagement correlato, errori correlati, early exit reasons e copy technical values.
- [x] `/cms/performance` deve mostrare sempre sample count e confidence vicino a trend, classifiche e KPI.
- [x] Rifare `/cms/errors` mantenendo l’inbox operativa ma sostituendo componenti duplicati con quelli condivisi osservabilità.
- [x] `/cms/errors` deve combinare `ErrorGroup`/`ErrorOccurrence` per inbox live e `DailyErrorAggregate` per KPI/trend storici se disponibili.
- [x] `/cms/errors` deve aprire con KPI: open, critical/high, regressions, nuovi recenti, blocked actions e affected sessions.
- [x] `/cms/errors` deve restare ordinata per priorità operativa e recenza, non per `occurrenceCount` grezzo.
- [x] `/cms/errors` deve avere tabs o filtri rapidi per open, investigating, resolved, ignored e regressions, usando `ObservabilityFilterSheet` per filtri avanzati.
- [x] `/cms/errors` deve mostrare priority reasons, severity, status, impact area, user impact, regressione, sessioni impattate e release senza costringere l’admin a leggere lo stack.
- [x] `/cms/errors` deve usare detail drawer con timeline occorrenze, stack redatto, metadata redatti, request/session/correlation IDs, fingerprint/signature e azioni status.
- [x] Rimuovere copy button, badge mapping, detail sections e helper duplicati dallo screen errors quando il componente condiviso li sostituisce.
- [x] Rifare `/cms/audit` come timeline di responsabilità su componenti condivisi, non tabella tecnica mascherata.
- [x] `/cms/audit` deve combinare `AuditActivity`/`AuditChange` per timeline live e `DailyAuditAggregate` per KPI/trend storici se disponibili.
- [x] `/cms/audit` deve aprire con KPI: high/critical, public impact, failures, sensitive actions, active actors e azioni recenti sensibili.
- [x] `/cms/audit` deve avere filtri rapidi: tutti, high risk, falliti, impatto pubblico, azioni sensibili.
- [x] `/cms/audit` deve mostrare ogni attività come evento di responsabilità con attore, risorsa, azione, outcome, risk, public impact, changed fields e createdAt.
- [x] `/cms/audit` deve usare detail drawer con actor/resource snapshot, diff applicato per `SUCCESS`, attempted summary per `FAILURE`, risk reasons, related errors e technical IDs.
- [x] Per attività `FAILURE`, la UI non deve mostrare un diff vuoto o suggerire mutazione applicata: deve mostrare tentativo non applicato ed errore redatto.
- [x] Rimuovere copy button, badge mapping, detail dialog e helper duplicati dallo screen audit quando il componente condiviso li sostituisce.
- [x] Definire loading state per `/cms/observability`, `/cms/telemetry`, `/cms/performance`, `/cms/errors` e `/cms/audit`, coerenti col layout CMS e senza skeleton casuali.
- [x] Garantire stati error e forbidden coerenti con il CMS per ogni pagina, senza esporre stack o dettagli tecnici lato UI.
- [x] Garantire responsive desktop/mobile: KPI in griglia su desktop e colonna su mobile, chart con altezza leggibile, tabelle dense convertite o rese scrollabili in modo intenzionale, filtri in sheet su mobile.
- [x] Usare server-side tRPC caller/prefetch dove utile per prima renderizzazione e hydration dei client screen, senza duplicare fetch server e client per gli stessi dati.
- [x] Separare componenti server e client: pagine server per auth/policy/prefetch, screen client solo quando servono filtri interattivi, drawer, mutation status o URL state.
- [x] Non mettere business logic di score, severity, risk, quality, percentili o aggregazione nei componenti React; la UI formatta e visualizza DTO già interpretati.
- [x] Aggiornare query parser e URL state per i nuovi filtri osservabilità: periodo/date range, pageType, contentType, deviceType, release, severity/status, risk/outcome e testo libero.
- [x] Aggiornare `RouterInputs`/`RouterOutputs`, prefetch server e hook CMS per le nuove route/procedure, eliminando riferimenti a route o procedure analytics legacy non più ufficiali.
- [x] Aggiornare copy i18n per spiegare in modo breve: sample confidence, aggregati giornalieri, quality score, perceived quality, regressione, rischio audit e differenza tra tentativo fallito e cambiamento applicato.
- [x] Non mostrare JSON grezzo come vista primaria; metadata, summary, diff, components e reasons devono essere leggibili, con JSON redatto solo come sezione tecnica secondaria se serve.
- [x] Mantenere copy button solo per valori tecnici utili all’indagine, non per ogni campo della pagina.
- [x] Aggiungere test unitari per `ObservabilityStatusBadge` su tutti gli enum usati: severity, status, risk, outcome, engagement, perceived quality e confidence.
- [x] Aggiungere test unitari per `QualityScoreBreakdown`: componenti, pesi, penalità, threshold version, confidence e denominatori non classificabili.
- [x] Aggiungere test unitari per formattatori UI: percentuali, durate, metriche performance, CLS unitless, date, valori null e confidence.
- [x] Aggiungere test per query parser URL delle nuove pagine osservabilità: periodo, filtri enum, date range, paginazione, sort e input invalidi.
- [x] Aggiungere test tRPC/DTO o page-level per overview, telemetry, performance, errors e audit, verificando che i dati principali arrivino da aggregati o dalle tabelle interpretate corrette.
- [x] Aggiungere test che confermino assenza di `FID`, `page_view`, `AnalyticsEvent`, `WebVital`, `AuditLog`, `ErrorLog` e route `/cms/analytics` come contratti UI ufficiali.
- [x] Aggiungere test UI essenziali dove l’infrastruttura lo consente: empty state, loading state, metric card, chart wrapper, detail drawer, copy values e azioni status errori.
- [x] Verificare accessibilità minima: heading gerarchici, label dei filtri, aria label per copy button, tooltip non necessari per capire il dato, navigazione tastiera nei drawer.
- [x] Verificare che chart e tabelle restino leggibili con zero dati, pochi dati, molti dati e campione a bassa confidence.
- [x] Verificare con typecheck, lint, unit test pertinenti, test completi e build.
- [x] Aggiornare questo documento se durante l’implementazione emergono decisioni su naming route, chart primitives, breakdown score, filtri o layout responsive, senza creare checklist parallele.

Deliverable Fase 8:

- [x] Route `/cms/observability` nuova, basata sugli aggregati Fase 7 e orientata a KPI/insight operativi sintetici.
- [x] Route `/cms/telemetry` nuova o riscritta, con rimozione di `/cms/analytics` come route ufficiale e senza redirect/alias legacy.
- [x] UI `/cms/performance` riscritta con chart reali, confidence, detail drawer e nessun riferimento a `FID`.
- [x] UI `/cms/errors` consolidata come inbox operativa con componenti osservabilità condivisi e KPI/trend aggregati.
- [x] UI `/cms/audit` consolidata come timeline di responsabilità con componenti osservabilità condivisi e KPI/trend aggregati.
- [x] Componenti condivisi osservabilità: metric card, status badge, chart card, filter sheet, detail drawer, quality score breakdown, sample confidence e empty states.
- [x] Chart primitives shadcn/recharts configurati e coerenti con palette CMS.
- [x] Navigation, i18n, metadata, loading/error/forbidden states e query parser aggiornati ai nuovi nomi e flussi.
- [x] Rimozione di route, componenti, helper, copy, test e import legacy non più usati o incoerenti col modello qualitativo.
- [x] Test unitari, query parser test, tRPC/DTO test e, dove possibile, UI smoke test sui casi critici.

Criterio di completamento:

- [x] Un admin apre `/cms/observability` e capisce in meno di 30 secondi se sistema e contenuti stanno bene e cosa guardare prima.
- [x] Ogni pagina osservabilità permette lettura rapida e indagine dettagliata senza cambiare strumento.
- [x] Nessuno score qualitativo appare senza componenti, motivazioni o confidence.
- [x] Le dashboard storiche leggono aggregati persistenti dove appropriato e non dipendono da raw event o query pesanti oltre la retention.
- [x] `/cms/telemetry` misura letture qualificate, completamenti, ritorni, tempo attivo e qualità contenuto, non page views legacy.
- [x] `/cms/performance` mostra esperienza percepita, p75, early exit, confidence e segmenti diagnostici, senza `FID` o Web Vitals standalone legacy.
- [x] `/cms/errors` resta una inbox ordinata per priorità operativa e impatto, non per conteggio grezzo.
- [x] `/cms/audit` mostra responsabilità, rischio, impatto pubblico, diff applicati e tentativi falliti senza JSON grezzo come fonte primaria.
- [x] I grafici chiariscono trend, distribuzioni o breakdown; nessun chart è decorativo o disconnesso da una domanda operativa.
- [x] Stati loading, empty, error, forbidden e mobile sono progettati, non incidentali.
- [x] Route/copy/componenti/test legacy incompatibili sono eliminati o riscritti, non mantenuti per compatibilità preventiva.
- [x] Il sistema resta funzionante e verificabile dopo la rimozione del legacy, anche se insight trasversali avanzati arrivano in Fase 9.

Verifiche previste:

- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm test:run tests/unit/lib/cms/query/*`
- [x] `pnpm test:run tests/unit/features/cms/observability/*`
- [x] `pnpm test:run tests/unit/lib/server/trpc/routers/observability-aggregates.test.ts`
- [x] `pnpm test:run`
- [x] `pnpm build`

### Fase 9: Correlazioni E Insight

Obiettivo: trasformare dati separati in insight trasversali.

Assunzione operativa: la Fase 1, la Fase 2, la Fase 3, la Fase 4, la Fase 5, la Fase 6, la Fase 7 e la Fase 8 sono state completate come descritte. Esistono quindi schema autorevole, collector qualitativo, session tracking, bot filtering, rate limit, engagement contenuti, errori operativi, performance qualitativa, audit qualitativo, aggregati giornalieri persistenti, job idempotenti e UI CMS osservabilità basata su shadcn charts. La Fase 9 non deve costruire metriche di base, aggregati o dashboard primarie: usa ciò che esiste per decidere cosa merita attenzione prima.

Principio di questa fase: insight-first, no retrocompatibilità. Overview statiche, KPI cards isolate, ranking hardcoded, summary runtime basati su raw event, query UI che ricostruiscono business logic, insight finti derivati da dati incompleti, route/procedure legacy e nomi generici tipo `analytics overview` non sono vincoli. Se codice, DTO, copy, test o componenti continuano a mostrare solo metriche separate senza priorità operativa, si buttano via o si riscrivono. Non si mantengono fallback a page views, Web Vitals legacy, `FID`, `AuditLog`, `ErrorLog`, `AnalyticsEvent`, raw event come fonte primaria, alias tRPC o componenti compatibili col modello provvisorio.

Scelta dello slice interpretato: `observabilityOverview` come dominio server dedicato agli insight trasversali. Gli aggregati Fase 7 restano la fonte storica efficiente; le tabelle interpretate (`ContentEngagement`, `PerformanceExperience`, `ErrorGroup`, `ErrorOccurrence`, `AuditActivity`, `AuditChange`) restano la fonte per correlazioni recenti e drilldown operativo. `ObservabilityEvent` non è fonte primaria degli insight, salvo diagnostica esplicita e limitata.

Insight iniziali da supportare:

- Contenuti con alto interesse ma performance scarsa.
- Pagine/contenuti molto iniziati ma poco letti.
- Errori che causano exit precoce o azioni fallite.
- Audit high risk seguito da errore o regressione.
- Release con peggioramento performance o aumento errori.
- Referrer con traffico basso ma letture complete alte, solo se il dato referrer disponibile è sufficiente e non richiede tracking cross-day.

Checklist operativa Fase 9:

- [ ] Rimuovere dalla overview Fase 8 ogni ranking statico o lista “cosa guardare prima” costruita manualmente da KPI separati, sostituendola con insight ordinati dal service.
- [ ] Rimuovere o riscrivere procedure, DTO, componenti, helper e test che trattano `observabilityAggregates.overview` come overview finale di prodotto se la UI ha bisogno di insight trasversali; gli aggregati restano fonte, non interpretazione finale.
- [ ] Non reintrodurre `/cms/analytics`, page views, `web-vital`, `FID`, `AuditLog`, `ErrorLog`, `AnalyticsEvent`, route legacy, alias tRPC o fallback su raw event per colmare insight mancanti.
- [ ] Creare modulo server dedicato `lib/server/modules/observability-overview/*` con `schema`, `dto`, `policy`, `repository`, `service` e `index` separati.
- [ ] Definire valori canonici `InsightType` iniziali: `critical_error_regression`, `blocking_error_with_exits`, `high_interest_poor_performance`, `opened_not_read`, `content_quality_opportunity`, `release_performance_regression`, `release_error_regression`, `audit_risk_followed_by_error`, `audit_failure_sensitive_action`, `referrer_quality_opportunity`.
- [ ] Definire valori canonici per severità insight: `low`, `medium`, `high`, `critical`, senza riusare in modo ambiguo severity errori o risk audit come se fossero lo stesso dominio.
- [ ] Definire valori canonici per entità collegate agli insight: `content`, `path`, `error_group`, `audit_activity`, `release`, `referrer`, `performance_segment`, `unknown`.
- [ ] Definire reason code stabili e leggibili per gli insight: ad esempio `quality_score_high`, `completion_rate_low`, `poor_performance_high`, `early_exit_after_poor_performance`, `critical_regression`, `blocked_action`, `high_risk_audit`, `release_delta_negative`, `low_sample_confidence`.
- [ ] Creare schema input Zod per overview/insight: periodo o date range, `pageType`, `contentType`, `contentId`, `path`, `release`, `severity`, `riskLevel`, `includeLowConfidence`, `limit`, con limiti massimi espliciti.
- [ ] Validare gli input usando vocabolari canonici già definiti nelle fasi precedenti quando disponibili, senza enum paralleli o valori speciali per compatibilità.
- [ ] Creare DTO `ObservabilityInsightDto` con `id`, `type`, `title`, `description`, `severity`, `score`, `confidence`, `reasons`, `primaryEntity`, `relatedEntities`, `metrics`, `deepLinks`, `dateRange` e `createdAt` logico o periodo di calcolo.
- [ ] Creare DTO `ObservabilityHealthScoreDto` con `score`, `status`, `components`, `penalties`, `bonuses`, `confidence`, `reasons` e periodo.
- [ ] Creare DTO `ObservabilityOverviewDto` con `period`, `healthScore`, KPI sintetici, `watchFirst`, `insights`, trend minimi e confidence complessiva.
- [ ] Garantire che ogni score o insight abbia breakdown, reasons e confidence; nessun numero qualitativo deve apparire come autorità opaca.
- [ ] Implementare policy del modulo overview, riusando le decisioni di accesso osservabilità ma senza hardcodare ruoli nel router o nei componenti UI.
- [ ] Implementare repository overview con metodi espliciti per leggere aggregati contenuto, performance, errori e audit nel periodo corrente e nel periodo precedente.
- [ ] Implementare repository overview con metodi espliciti per correlazioni recenti su tabelle interpretate: contenuto-performance, errore-exit, audit-error, release-error e referrer-engagement.
- [ ] Non leggere `ObservabilityEvent` come fonte primaria degli insight; se una correlazione richiede raw event, limitarla a diagnostica recente esplicitamente nominata e testata.
- [ ] Escludere di default sessioni `isLikelyBot = true` da insight qualitativi, mantenendo segnali errori/audit critici quando sono operativi e non telemetry pubblica.
- [ ] Implementare scoring generale insight con formula riproducibile: impatto, confidence, recency, severità e actionability, con clamp 0-100 e pesi versionati o nominati.
- [ ] Salvare o restituire `scoreComponents`/`metrics` sufficienti a spiegare perché un insight è stato ordinato sopra un altro.
- [ ] Penalizzare insight con sample confidence bassa; un insight a bassa evidenza può comparire solo se richiesto o se il rischio operativo è critical.
- [ ] Implementare deduplicazione insight: lo stesso contenuto/path/release/error group non deve produrre tre card equivalenti che competono tra loro senza aggiungere informazione.
- [ ] Ordinare `watchFirst` per score, severità, recency e actionability, non per volume grezzo o ordine hardcoded in UI.
- [ ] Implementare `critical_error_regression` da `ErrorGroup`, `ErrorOccurrence` e `DailyErrorAggregate`, distinguendo regressione confermata da semplice nuovo errore.
- [ ] Implementare `blocking_error_with_exits` correlando errori operativi con `ContentEngagement` e `PerformanceExperience` tramite `sessionId`, `path`, `contentId`, `requestId`, `correlationId` e finestra temporale ragionevole.
- [ ] Non dichiarare causalità forte se esiste solo correlazione temporale debole: usare copy e reason come “probabile frizione” o “correlato a exit”, non “ha causato” senza evidenza sufficiente.
- [ ] Implementare `high_interest_poor_performance` correlando `DailyContentQualityAggregate` e `DailyPerformanceAggregate` per `contentId`, `path`, `pageType` e periodo.
- [ ] Definire soglie iniziali per “alto interesse”: quality score alto, qualified visits significative, completamenti o ritorni significativi, sempre con sample confidence sufficiente.
- [ ] Definire soglie iniziali per “performance scarsa”: `frustratingCount`, `brokenCount`, `poorRate`, `earlyExitCount` e p75 critici, senza usare Web Vitals isolati come prova unica di impatto.
- [ ] Implementare `opened_not_read` da `DailyContentQualityAggregate`, usando `totalVisits`, `qualifiedVisits`, `completedReads`, `qualifiedRatio`, completion rate e active time, senza chiamare il dato “views”.
- [ ] Implementare `content_quality_opportunity` per contenuti con poche visite ma completion rate/quality score alto, evitando classifiche aggressive su campioni piccoli.
- [ ] Implementare `release_performance_regression` confrontando periodo corrente e periodo precedente per `release`, `pageType`, `path` e device quando disponibile.
- [ ] Implementare `release_error_regression` confrontando regressioni, critical/high, blocked actions e occorrenze per `release`, distinguendo volume da severità.
- [ ] Implementare `audit_risk_followed_by_error` correlando `AuditActivity` high/critical con `ErrorOccurrence`/`ErrorGroup` tramite `requestId`, `correlationId` e finestra temporale stretta, senza dipendenza ciclica tra moduli.
- [ ] Implementare `audit_failure_sensitive_action` da `AuditActivity` e `DailyAuditAggregate`, privilegiando failure su publish, upload, delete, role change, navigation pubblica e contenuti pubblicati.
- [ ] Implementare `referrer_quality_opportunity` solo usando dati già raccolti in modo privacy-safe: `ObservabilitySession.referrerDomain`, `ContentEngagement`, `AudioEngagement` e aggregati derivati se introdotti.
- [ ] Se gli insight referrer risultano troppo costosi o insufficienti sui dati interpretati, introdurre una tabella netta `DailyAcquisitionQualityAggregate` con migrazione nuova, senza backfill legacy, mapping da analytics o compatibilità con page views.
- [ ] Se `DailyAcquisitionQualityAggregate` viene introdotta, definirla con `date`, `referrerDomain`, `pageType`, `contentType`, `contentId`, `path`, `qualifiedVisits`, `completedReads`, `completionRate`, `averageActiveTimeMs`, `qualityScoreAverage`, `sampleConfidence`, `createdAt`, `updatedAt`.
- [ ] Se `DailyAcquisitionQualityAggregate` non viene introdotta in questa fase, non simulare storico referrer nella UI: limitare l’insight referrer a finestre recenti sostenibili o marcarlo fuori scope della prima iterazione Fase 9.
- [ ] Implementare `systemHealthScore` con formula esplicita e breakdown: penalità per errori critical/high aperti, regressioni, performance broken/frustrating, audit failure high/critical e confidence bassa; bonus moderato per contenuti con qualità alta e campione affidabile.
- [ ] Impedire che il bonus contenuti nasconda rischi operativi critical: errori critical, regressioni o audit security-sensitive devono dominare lo score salute.
- [ ] Definire deep link per ogni insight verso `/cms/errors`, `/cms/performance`, `/cms/telemetry` o `/cms/audit` con filtri reali supportati dal query parser.
- [ ] Non generare deep link con parametri non supportati; aggiungere il filtro mancante al query parser o omettere il link specifico.
- [ ] Aggiornare query parser CMS per eventuali filtri nuovi necessari agli insight: `contentId`, `path`, `release`, `referrerDomain`, `regression`, `riskLevel`, `severity`, periodo e sort.
- [ ] Creare router tRPC dedicato `observabilityOverview` con procedure `overview` e, se utile, `insights`, usando policy del modulo, service orchestration e `parseOutput` sui DTO.
- [ ] Collegare il router al root router senza alias legacy o procedure annidate in `telemetry`/`observabilityAggregates`.
- [ ] Aggiornare `/cms/observability` perché legga `observabilityOverview.overview`, non costruisca insight lato React da array di aggregati.
- [ ] Creare o aggiornare componenti UI condivisi: `ObservabilityInsightCard`, `ObservabilityHealthScore`, `InsightReasonsList`, `InsightDeepLinks` e `ObservabilityPriorityList`.
- [ ] La overview deve aprire con health score, confidence e prime 3-5 priorità operative, non con grafici decorativi o KPI isolati.
- [ ] La sezione “Cosa guardare prima” deve essere generata da `watchFirst` del DTO, con severity, score, reasons e deep link.
- [ ] Le insight cards devono mostrare titolo, spiegazione, impatto, confidence, motivi principali e azione consigliata o link di indagine.
- [ ] I grafici overview restano contesto secondario: trend qualità, performance percepita, errori e audit non devono sostituire il ranking insight.
- [ ] Aggiornare copy i18n CMS per spiegare insight, confidence, correlazione, release regression, audit seguito da errore e differenza tra correlazione e causalità.
- [ ] Non mostrare JSON grezzo come spiegazione primaria degli insight; `metrics` e `reasons` devono essere leggibili e redatti.
- [ ] Aggiungere empty state specifico: nessun insight perché non ci sono dati, aggregati non generati, campione insufficiente, filtri troppo stretti o permessi mancanti.
- [ ] Garantire layout responsive della overview insight: health score e watch-first leggibili su mobile, deep link accessibili, card non dipendenti da hover o tooltip.
- [ ] Aggiungere test unitari per scoring generale insight: impatto, confidence, recency, severity, actionability, clamp e ordinamento.
- [ ] Aggiungere test unitari per deduplicazione insight e priorità `watchFirst`.
- [ ] Aggiungere test per `systemHealthScore`: errori critical dominanti, performance broken, audit failure, low confidence e bonus contenuti.
- [ ] Aggiungere test per `critical_error_regression` e `release_error_regression`, distinguendo regressione confermata, nuovo errore e volume non critico.
- [ ] Aggiungere test per `blocking_error_with_exits` con correlazione forte, correlazione debole e nessuna correlazione.
- [ ] Aggiungere test per `high_interest_poor_performance` e `opened_not_read`, inclusi campione basso, denominatori zero e contenuti bot esclusi.
- [ ] Aggiungere test per `release_performance_regression` confrontando periodo corrente e precedente, con sample confidence e device/pageType quando disponibili.
- [ ] Aggiungere test per `audit_risk_followed_by_error` e `audit_failure_sensitive_action`, inclusi `requestId`, `correlationId` e finestra temporale.
- [ ] Aggiungere test per `referrer_quality_opportunity` oppure test esplicito che lo slice lo esclude quando i dati referrer non sono sufficienti.
- [ ] Aggiungere test repository per query cross-domain e limiti di periodo, assicurando che non leggano raw event come fonte primaria.
- [ ] Aggiungere test tRPC/DTO per `overview`, `insights`, filtri, policy, output validation e assenza di alias legacy.
- [ ] Aggiungere test UI essenziali per health score, insight cards, watch-first, deep link, empty state, confidence bassa e assenza di insight finti se non ci sono dati.
- [ ] Aggiungere test che confermino assenza di `FID`, `page_view`, `AnalyticsEvent`, `WebVital`, `AuditLog`, `ErrorLog`, `/cms/analytics` e raw event come contratti ufficiali della overview.
- [ ] Verificare con `prisma validate`, generazione client se lo schema cambia, typecheck, lint, unit test pertinenti, test completi e build.
- [ ] Aggiornare questo documento se durante l’implementazione emergono decisioni su scoring insight, soglie, referrer aggregate, deep link o health score, senza creare checklist parallele.

Deliverable Fase 9:

- [ ] Modulo server dedicato `observability-overview` con `schema`, `dto`, `policy`, `repository`, `service` e `index` separati.
- [ ] Vocabolario canonico per insight type, severity insight, entity type e reason code.
- [ ] Service insight con scoring deterministico, confidence, deduplicazione, ranking, health score e deep link.
- [ ] Repository cross-domain che legge aggregati persistenti e tabelle interpretate recenti, non raw event come fonte primaria.
- [ ] Router tRPC `observabilityOverview` con procedure `overview` e insight dedicati, collegato al root router senza alias legacy.
- [ ] DTO overview con health score, KPI sintetici, `watchFirst`, insight cards, trend contestuali e confidence complessiva.
- [ ] UI `/cms/observability` aggiornata per mostrare priorità operative reali, insight cards e health score, non solo metriche aggregate.
- [ ] Deep link funzionanti verso telemetry, performance, errors e audit con filtri reali supportati.
- [ ] Eventuale `DailyAcquisitionQualityAggregate` solo se necessario per insight referrer, con migrazione netta e senza mapping legacy.
- [ ] Test unitari, repository test, service test, tRPC/DTO test e UI smoke test sui casi critici.

Criterio di completamento:

- [ ] Un admin apre `/cms/observability` e capisce cosa guardare prima senza interpretare manualmente quattro dashboard separate.
- [ ] La overview mostra insight ordinati per impatto, severità, confidence, recency e actionability, non per volume grezzo o ordine hardcoded.
- [ ] Ogni insight mostra score, confidence, reasons, metriche principali e deep link verso la pagina operativa corretta.
- [ ] Health score e insight sono spiegabili con componenti e penalità, non numeri opachi.
- [ ] Contenuti ad alto interesse ma performance scarsa emergono come priorità editoriale/tecnica.
- [ ] Contenuti molto iniziati ma poco letti emergono senza usare page views legacy come metrica primaria.
- [ ] Errori bloccanti correlati a exit o azioni fallite emergono sopra errori solo frequenti ma poco impattanti.
- [ ] Audit high risk seguito da errore/regressione emerge come rischio operativo correlato tramite request/correlation/time window.
- [ ] Release con peggioramento performance o aumento errori emergono con confronto periodo corrente/precedente e confidence.
- [ ] Insight referrer esiste solo se basato su dati privacy-safe reali e sufficienti; se non c’è evidenza, non viene simulato.
- [ ] Campione basso riduce autorità e ranking degli insight, salvo rischio critical esplicito.
- [ ] Nessuna logica di scoring, ranking, severity, correlazione o health score vive nei componenti React.
- [ ] Raw event, page views, Web Vitals legacy, `FID`, `AuditLog`, `ErrorLog`, `AnalyticsEvent` e route legacy non sono fonti ufficiali o fallback della overview.
- [ ] Il sistema resta funzionante e verificabile dopo la rimozione del codice non più usato, anche se hardening privacy/export/documentazione finale arrivano in Fase 10.

Verifiche previste:

- `pnpm prisma:validate`
- `pnpm prisma:generate` se lo schema cambia
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:run tests/unit/lib/server/modules/observability-overview/*`
- `pnpm test:run tests/unit/lib/server/trpc/routers/observability-overview.test.ts`
- `pnpm test:run tests/unit/features/cms/observability/*`
- `pnpm test:run`
- `pnpm build`

### Fase 10: Hardening, Privacy E Qualità

Obiettivo: rendere il sistema credibile, sicuro e mantenibile. Rispetto alla prima stesura, bot filtering, rate limit e campionamento non sono qui: sono già in Fase 0 e 2, perché incidono sui dati a monte.

Assunzione operativa: la Fase 1, la Fase 2, la Fase 3, la Fase 4, la Fase 5, la Fase 6, la Fase 7, la Fase 8 e la Fase 9 sono state completate come descritte. Esistono quindi schema autorevole, collector qualitativo, session tracking, bot filtering, rate limit, privacy gating, engagement contenuti, errori operativi, performance qualitativa, audit qualitativo, aggregati giornalieri persistenti, UI CMS osservabilità e overview insight-driven. La Fase 10 non deve costruire nuove metriche di base, nuove dashboard primarie o nuovi modelli qualitativi: chiude il sistema verificando privacy, sicurezza, export, documentazione, qualità e rimozione dei residui.

Principio di questa fase: hardening-first, no retrocompatibilità. Codice, route, export, DTO, test, copy, script o documentazione che esistono solo per proteggere contratti provvisori vanno eliminati o riscritti. Non si mantengono alias, redirect, wrapper, mapping legacy, doppie procedure, vecchi nomi per nuove metriche, export grezzi, fallback a raw event, supporto a `page_view`, `web-vital`, `FID`, `AnalyticsEvent`, `WebVital`, `ErrorLog`, `AuditLog`, `/cms/analytics` o modelli views-based. Se una cosa non serve più al modello qualitativo finale, si butta via.

Checklist operativa Fase 10:

- [ ] Eseguire un audit finale dei contratti ufficiali osservabilità, confermando che le sole pagine CMS autorevoli siano `/cms/observability`, `/cms/telemetry`, `/cms/performance`, `/cms/errors` e `/cms/audit`.
- [ ] Rimuovere definitivamente route, navigazione, metadata, prefetch, query parser, test e copy collegati a `/cms/analytics` o ad analytics views-based, senza redirect o alias compatibili.
- [ ] Cercare e rimuovere residui raggiungibili di `page_view`, `article_view`, `issue_view`, `listen_view`, `web-vital`, `FID`, `AnalyticsEvent`, `WebVital`, `ErrorLog`, `AuditLog`, `auditLogs`, `analyticsSummary`, `reportWebVital`, `track()` e nomi equivalenti non più ufficiali.
- [ ] Rimuovere export/import pubblici che espongono DTO, schema, procedure o helper legacy come API ufficiali, invece di lasciarli inutilizzati ma raggiungibili.
- [ ] Rimuovere test che proteggono comportamenti legacy e sostituirli con test di assenza esplicita dei vecchi contratti dove il rischio di regressione è alto.
- [ ] Confermare che `ObservabilityEvent` non sia usato come fonte primaria da dashboard, overview, insight, aggregati storici o export, salvo diagnostica recente esplicitamente nominata e testata.
- [ ] Confermare che nessuna logica di scoring, severity, risk, quality score, health score, percentile, ranking insight o correlazione viva nei componenti React; la UI deve visualizzare DTO già interpretati.
- [ ] Consolidare una sola pipeline autorevole di redazione per metadata, path, referrer, user-agent, stack trace, messaggi errore, diff audit, actor/resource snapshot, attempted summary, reasons, metrics ed export.
- [ ] Rimuovere redattori duplicati o locali se divergono dalle regole canoniche; se servono wrapper di dominio, devono chiamare la pipeline condivisa e non ridefinire blacklist o limiti.
- [ ] Impedire in modo deterministico la persistenza o esposizione di `Authorization`, bearer token, cookie, password, secret, API key, session token, CSRF token, body request, query string sensibili e payload completi non necessari.
- [ ] Redigere stack trace rimuovendo path assoluti, numeri di riga/colonna quando non necessari, UUID, hex, query string, valori utente e frame vendor non utili al fingerprint o alla diagnosi.
- [ ] Redigere messaggi errore e metadata senza distruggere il valore operativo: mantenere tipo, area, action context e reason leggibili, eliminando dati dinamici o personali.
- [ ] Redigere diff audit e snapshot salvando solo summary ammessi: niente rich text completo, niente JSON arbitrari completi, niente payload input integrale, niente dati auth sensibili.
- [ ] Applicare limiti globali e testati a metadata e snapshot: dimensione massima totale, numero massimo chiavi, profondità massima, lunghezza stringhe, cardinalità campi liberi e comportamento di truncation/redaction.
- [ ] Normalizzare path lato server in tutti i punti finali: rimuovere query string, fragment, token, ID dinamici non necessari e valori ad alta cardinalità quando il template o bucket è sufficiente.
- [ ] Normalizzare referrer salvando solo dominio o categoria ammessa, senza full URL con query o path invasivi.
- [ ] Introdurre o verificare bucket espliciti per dimensioni assenti o troppo variabili: `unknown`, `other`, path normalizzato, release assente, referrer non classificabile e contentId nullo.
- [ ] Verificare che i limiti di cardinalità si applichino anche ad aggregati, insight e export, non solo al collector.
- [ ] Verificare end-to-end `collectionMode = "minimal"`: niente heartbeat, niente scroll milestone, niente segnali comportamentali opzionali, niente performance context invasivo.
- [ ] Verificare che Do Not Track e Global Privacy Control riducano realmente la raccolta e non siano solo copy o flag ignorati.
- [ ] Confermare che non esista tracking cross-day per persona: niente cookie identificativi osservabilità, niente localStorage persistente per visitor identity, niente hash stabile multi-giorno e niente identificatori marketing.
- [ ] Confermare che `visitorHash` resti derivato lato server con salt giornaliero e che nessun export o DTO lo trasformi in identificatore utente leggibile.
- [ ] Confermare che bot filtering e rate limit non vengano spostati o duplicati in Fase 10: questa fase verifica e testa il comportamento esistente, non lo reinterpreta.
- [ ] Confermare che errori operativi e audit CMS critici non siano persi per privacy minimal, DNT/GPC o bot filtering pubblico: sono segnali operativi, non tracking pubblico opzionale.
- [ ] Definire esplicitamente quali export CSV sono ammessi nella prima versione: errori, audit e telemetry contenuti; performance solo se c'è un uso operativo chiaro.
- [ ] Non esportare raw event, payload collector grezzi, metadata completi, stack non redatti, body request, header sensibili, cookie, token, IP grezzi o dati personali non necessari.
- [ ] Implementare export CSV come procedure o route protette da policy del dominio, senza hardcodare ruoli nei router o nei componenti UI.
- [ ] Fare in modo che ogni export usi DTO già redatti o mapper di export dedicati che applicano le stesse regole di privacy della UI.
- [ ] Applicare a ogni export filtri obbligatori o default sicuri: periodo massimo, paginazione/limite righe, sort deterministico e campi esplicitamente allowlisted.
- [ ] Implementare CSV escaping corretto per virgole, virgolette, newline e formule potenzialmente pericolose, evitando CSV injection in celle che iniziano con `=`, `+`, `-` o `@`.
- [ ] Aggiungere filename e intestazioni export stabili e non contenenti dati sensibili; includere periodo, dominio e timestamp server se utile.
- [ ] Documentare che gli export sono viste operative filtrate, non dump completi del database o meccanismi di portabilità dati personali.
- [ ] Aggiornare UI solo dove utile con azioni export chiare e subordinate ai filtri correnti; niente pulsanti export generici se il dominio non ha un export sicuro.
- [ ] Aggiornare `docs/architecture.md` con il modello finale di osservabilità: collector, tabelle interpretate, aggregati, overview insight, retention, privacy, export e responsabilità dei moduli.
- [ ] Aggiornare `README.md` solo per istruzioni operative essenziali: comandi osservabilità, env retention, job schedule consigliato, verifica manuale e cosa non va esportato o loggato.
- [ ] Aggiornare `docs/observability-quality.md` con eventuali decisioni finali su export, redazione, limiti cardinalità, retention o privacy emerse durante Fase 10, senza creare documenti paralleli.
- [ ] Aggiornare `scripts/README.md` se i comandi o le env di job/retention cambiano, eliminando istruzioni non eseguibili invece di marcarle come legacy.
- [ ] Documentare per admin il significato operativo di quality score, health score, insight severity, sample confidence, perceived quality, regressione, rischio audit e differenza tra correlazione e causalità.
- [ ] Documentare per admin perché non esistono page views come metrica primaria e quali nomi usare al loro posto: letture qualificate, completamenti, episodi, total visits da engagement e sessioni impattate.
- [ ] Documentare retention finale: raw breve, interpretati medi, occorrenze errore secondo policy, aggregati lunghi e audit più conservativo, con impatto sulle dashboard storiche.
- [ ] Documentare comportamento privacy: consenso, DNT, GPC, collection minimal/full, visitor hash giornaliero, niente tracking cross-day e limiti degli insight referrer.
- [ ] Verificare che pagine privacy/cookie pubbliche non promettano meno o più di ciò che il collector fa realmente; se il copy non è allineato, aggiornarlo senza mantenere formulazioni obsolete.
- [ ] Aggiungere test unitari per redazione di token, bearer token, cookie, password, secret, API key, email, query sensibili, body-like metadata, path assoluti, UUID, numeri dinamici e stack trace rumorosi.
- [ ] Aggiungere test unitari per limiti metadata/snapshot: dimensione, profondità, numero chiavi, lunghezza stringhe, array grandi, oggetti annidati e valori non serializzabili.
- [ ] Aggiungere test collector per DNT, GPC, `collectionMode = "minimal"`, payload legacy ignorati, `FID` rifiutato, metadata oversized, path tecnico e risposta non informativa.
- [ ] Aggiungere test route o service per export CSV: policy, filtri, limiti, escaping, CSV injection, assenza campi sensibili e uso di DTO redatti.
- [ ] Aggiungere test per assenza di contratti legacy ufficiali: route `/cms/analytics`, payload `web-vital`, `FID`, `AnalyticsEvent`, `WebVital`, `ErrorLog`, `AuditLog`, page views come metrica primaria e raw event come fonte overview.
- [ ] Aggiungere test parser URL UI per eventuali filtri export o filtri insight finali, rifiutando parametri non supportati invece di generarli nei deep link.
- [ ] Rieseguire test aggregazioni idempotenti, lock job, prune retention, sample-rate-aware counts, quality score, p75 performance, insight ranking e health score dopo eventuali modifiche di hardening.
- [ ] Verificare accessibilità finale delle pagine osservabilità: heading, label filtri, pulsanti export, copy technical values, drawer, keyboard navigation, empty state e chart leggibili senza tooltip obbligatori.
- [ ] Verificare responsive finale su mobile: overview insight, tabelle scrollabili, drawer, filtri, export e KPI non devono dipendere da hover o layout desktop.
- [ ] Verificare che empty state distinguano correttamente nessun dato, aggregati non generati, filtri troppo stretti, campione insufficiente, permessi mancanti e privacy minimal.
- [ ] Verificare che ogni score, insight, KPI qualitativo o classifica mostri confidence, reasons, breakdown o link immediato al dettaglio; nessun numero qualitativo deve apparire opaco.
- [ ] Verificare che log interni e fallback console non stampino body, header sensibili, cookie, token, metadata completi, stack non redatti o dati personali non necessari.
- [ ] Verificare che errori di persistenza audit/errori/collector degradino in modo sicuro: niente leak nei log e niente rottura di mutation CMS non correlate quando il fallback previsto lo consente.
- [ ] Verificare che le policy osservabilità siano coerenti tra overview, telemetry, performance, errors, audit, aggregates, export e job, senza ruoli hardcoded nei router.
- [ ] Verificare che gli indici e le query dei domini osservabilità coprano i filtri finali usati da UI, export e insight, senza query full-scan evitabili su raw event.
- [ ] Verificare che le env osservabilità abbiano default sicuri in locale/test e requisiti espliciti in produzione, in particolare Redis rate limiting e retention se richiesti.
- [ ] Rimuovere componenti UI condivisi non più usati, formatter duplicati, badge mapping duplicati, helper copy locali, schema Zod non importati, DTO morti e mock non raggiungibili.
- [ ] Rimuovere script, package command o documentazione operativa non più validi, invece di lasciarli come compatibilità non supportata.
- [ ] Aggiornare eventuali snapshot/test fixture ai contratti finali, eliminando fixture legacy che simulano views, FID, AuditLog, ErrorLog o WebVital.
- [ ] Eseguire un controllo finale del bundle/import tree per evitare che client pubblico includa codice server-only, redazione server o moduli CMS non necessari.
- [ ] Eseguire un controllo finale Prisma/schema per confermare che non restino modelli legacy, colonne ponte o campi compatibili non usati introdotti solo per transizione.
- [ ] Aggiornare questo documento spuntando solo ciò che è davvero completato e aggiungendo le verifiche effettivamente eseguite, senza creare checklist parallele.

Deliverable Fase 10:

- [ ] Hardening privacy/redaction centralizzato e riusato da collector, errori, audit, performance, telemetry, overview, export e log fallback.
- [ ] Limiti cardinalità e dimensione applicati e testati per metadata, path, referrer, snapshot, diff, reasons e metrics.
- [ ] Export CSV sicuri e filtrati per i domini scelti, basati su DTO redatti e policy di modulo, senza dump raw o dati sensibili.
- [ ] Documentazione aggiornata in `docs/observability-quality.md`, `docs/architecture.md`, `README.md` e, se necessario, `scripts/README.md`.
- [ ] Copy admin aggiornato per spiegare metriche qualitative, confidence, retention, privacy, insight e assenza di page views come metrica primaria.
- [ ] Test privacy, collector, export, URL parser, aggregati, sample-rate, insight, UI smoke e assenza legacy sui casi critici.
- [ ] Rimozione definitiva di route, procedure, DTO, helper, script, test, fixture, copy e import non più usati o incoerenti col modello qualitativo.
- [ ] Verifica finale completa del sistema con typecheck, lint, test e build.

Criterio di completamento:

- [ ] Il sistema raccoglie dati utili senza diventare invasivo: ogni dato raccolto ha una ragione operativa esplicita.
- [ ] Ogni dato visibile in UI o export ha definizione, confidence, breakdown, reasons o contesto sufficiente per essere interpretato correttamente.
- [ ] Collector, audit, errors, performance, telemetry, overview, export e log fallback non conservano né espongono token, Authorization header, cookie, body request, password, secret o dati personali non necessari.
- [ ] DNT, GPC e privacy minimal sono rispettati end-to-end e coperti da test.
- [ ] Non esiste tracking per-visitatore cross-day e nessun identificatore persistente viene introdotto per aggirare la scelta privacy-first.
- [ ] Export CSV sono filtrati, limitati, redatti, protetti da policy e immuni da CSV injection sui campi controllabili.
- [ ] Retention è implementata, documentata e verificata senza rompere dashboard storiche, insight o audit necessario.
- [ ] Nessuna dashboard, overview, insight o export usa raw event, page views, Web Vitals legacy, `FID`, `AnalyticsEvent`, `WebVital`, `ErrorLog` o `AuditLog` come fonte ufficiale o fallback.
- [ ] Nessuna route, procedura, tipo, test o documento attivo protegge contratti provvisori solo per retrocompatibilità.
- [ ] Admin e developer possono capire cosa significa ogni metrica qualitativa, come viene calcolata, quanto è affidabile e quali dati sono esclusi per privacy o bassa confidence.
- [ ] Il sistema resta funzionante, verificabile e mantenibile dopo la rimozione del codice non più usato.

Verifiche previste:

- `pnpm prisma:validate`
- `pnpm prisma:generate` se lo schema cambia
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:run tests/unit/lib/server/modules/observability/model.test.ts`
- `pnpm test:run tests/unit/lib/server/modules/telemetry/*`
- `pnpm test:run tests/unit/lib/server/modules/observability-errors/*`
- `pnpm test:run tests/unit/lib/server/modules/observability-performance/*`
- `pnpm test:run tests/unit/lib/server/modules/observability-audit/*`
- `pnpm test:run tests/unit/lib/server/modules/observability-aggregates/*`
- `pnpm test:run tests/unit/lib/server/modules/observability-overview/*`
- `pnpm test:run tests/unit/app/api/telemetry/route.test.ts`
- `pnpm test:run tests/unit/lib/cms/query/*`
- `pnpm test:run tests/unit/features/cms/observability/*`
- `pnpm test:run tests/unit/scripts/observability-cli.test.ts`
- `pnpm test:run`
- `pnpm build`

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
