# Piano: Questionari

## Obiettivo

Introdurre i questionari come nuovo contenuto editoriale, con:

- CMS per elenco, creazione, modifica, pubblicazione, chiusura e archivio.
- Builder visuale avanzato per una definizione JSON versionata.
- Compilazione pubblica multi-step con resume locale tramite IndexedDB.
- Un invio per browser attraverso token anonimo in cookie.
- Consultazione completa delle risposte nel CMS ed export CSV.
- Blocco home che mostra la compilazione quando il questionario e aperto e risultati aggregati quando e chiuso.

La V1 usa step lineari. Non supporta logiche condizionali tra campi o step.

## Decisioni di prodotto

- Una risposta per browser, non una garanzia assoluta di una risposta per persona.
- Identificativo anonimo in cookie HttpOnly; il database impone l'unicita per questionario.
- Resume solo sullo stesso browser, tramite IndexedDB.
- Dopo il primo invio, la struttura del questionario e bloccata.
- Dopo il primo invio restano modificabili copy editoriale e metadati non strutturali.
- Risultati pubblici disponibili solo quando il questionario e `CLOSED`.
- Una domanda deve essere marcata esplicitamente come visualizzabile per comparire nella dashboard pubblica.
- Le risposte individuali non sono mai inviate al browser pubblico.
- CMS con lista, dettaglio e export CSV delle risposte.

## Limite dell'unicita anonima

Il cookie anonimo impedisce un secondo invio dal medesimo browser finche il cookie resta presente. Non impedisce a una persona di cancellare cookie, usare navigazione privata o un altro browser/dispositivo.

Una garanzia di una risposta per persona richiederebbe autenticazione pubblica o verifica email. La V1 non le introduce per mantenere la compilazione aperta e a basso attrito.

## Modello dati

### Questionnaire

Nuovo modello Prisma `Questionnaire`:

- `id`: UUID.
- `title`: titolo editoriale obbligatorio.
- `slug`: globale, univoco e normalizzato lato API.
- `descriptionRich`: introduzione editoriale opzionale.
- `definition`: JSON obbligatorio, validato e versionato.
- `status`: `DRAFT | PUBLISHED | CLOSED | ARCHIVED`.
- `publishedAt`: valorizzato solo in stato `PUBLISHED` o `CLOSED`.
- `closedAt`: data di chiusura effettiva.
- `firstResponseAt`: impostato atomically al primo invio riuscito.
- `createdAt`, `updatedAt`.

Indici previsti:

- unicita su `slug`;
- indice su `[status, publishedAt]`;
- indice su `closedAt` se servira per archivi/report.

### QuestionnaireResponse

Nuovo modello Prisma `QuestionnaireResponse`:

- `id`: UUID.
- `questionnaireId`: relazione al questionario, hard delete a cascata oppure delete bloccata fino alla scelta di retention definitiva.
- `schemaVersion`: versione della definizione al momento dell'invio.
- `definitionSnapshot`: snapshot minimo della definizione necessario a rendere storicamente leggibile la risposta.
- `anonymousTokenHash`: hash server-side del token casuale del browser.
- `answers`: JSON validato contro lo snapshot della definizione.
- `submittedAt`.

Vincoli e indici:

- `@@unique([questionnaireId, anonymousTokenHash])` per impedire invii duplicati concorrenti.
- indice su `[questionnaireId, submittedAt]` per lista risposte, aggregati ed export.
- non salvare IP, user agent o altri identificativi tecnici nella risposta.

### Retention e cancellazione

La scelta tra hard delete a cascata e blocco della cancellazione deve essere fissata prima dell'implementazione. Per dati raccolti da utenti, la scelta consigliata e bloccare la cancellazione del questionario con risposte e fornire una procedura amministrativa di cancellazione/retention esplicita. Non cancellare o anonimizzare dati automaticamente senza una policy approvata.

## Definizione JSON

La definizione e un payload JSON con versione, step e campi. E la fonte di verita tecnica, ma non e l'interfaccia primaria di editing.

```ts
type QuestionnaireDefinition = {
  version: 1;
  steps: QuestionnaireStep[];
};

type QuestionnaireStep = {
  id: string;
  title?: string;
  description?: string;
  fields: QuestionnaireField[];
};
```

Ogni step e ordinato e ogni campo ha un ID stabile. Gli ID non vengono rigenerati durante modifiche di copy; sono la chiave della risposta e dell'export.

### Tipi di campo V1

| Tipo              | Opzioni                                      |
| ----------------- | -------------------------------------------- |
| Testo breve       | required, min/max length, placeholder        |
| Testo lungo       | required, min/max length, placeholder        |
| Intero            | required, min, max, step                     |
| Decimale          | required, min, max, step                     |
| Booleano          | required, label true/false                   |
| Data              | required, min, max                           |
| Data e ora        | required, min, max                           |
| Email             | required, max length                         |
| Telefono          | required, min/max length                     |
| URL               | required, max length                         |
| Scelta singola    | required, opzioni stabili                    |
| Scelta multipla   | required, opzioni stabili, min/max selezioni |
| Scala             | required, min, max, step, label estremi      |
| Consenso          | testo legale, required                       |
| Testo informativo | contenuto senza valore di risposta           |

Le opzioni di scelta hanno un `id` stabile e una label editabile. Le risposte salvano gli ID, non soltanto le label.

### Opzioni pubbliche

Ogni campo puo impostare `publicResults: boolean`.

I seguenti tipi non sono pubblicabili, indipendentemente dalla configurazione CMS:

- testo breve e testo lungo;
- email;
- telefono;
- URL;
- consenso.

I tipi aggregabili pubblicamente sono booleano, data/data-ora, scelta singola/multipla, scala e numeri. Il servizio backend applica questa whitelist: il renderer pubblico non decide la privacy.

### Limiti del sistema aperto

Il server deve imporre limiti prima di persistere la definizione o un invio:

- massimo numero di step;
- massimo numero totale di campi;
- massimo numero di opzioni per campo;
- massima lunghezza di label, descrizioni e input;
- massima dimensione del JSON definition e answers;
- unicita di ID step, ID campo e ID opzione;
- compatibilita tra tipo e opzioni configurate.

Non esporre espressioni regolari arbitrarie per validare il testo: possono causare costi di elaborazione imprevedibili. Per email, telefono e URL usare validatori espliciti e deterministici.

## Stati e invarianti

| Stato     | Visibilita pubblica | Invii | Risultati pubblici             |
| --------- | ------------------- | ----- | ------------------------------ |
| DRAFT     | No                  | No    | No                             |
| PUBLISHED | Si                  | Si    | No                             |
| CLOSED    | Si                  | No    | Si, solo aggregati autorizzati |
| ARCHIVED  | No                  | No    | No                             |

Invarianti server-side:

- una definizione pubblicata deve avere almeno uno step e un campo compilabile;
- lo step corrente puo avanzare solo se i suoi required sono validi;
- `false` e un valore valido per un booleano required;
- un invio e accettato solo con questionario `PUBLISHED`;
- lo stesso token puo inviare una sola volta per questionario;
- al primo invio, impostare `firstResponseAt` e bloccare ogni cambiamento strutturale successivo;
- `CLOSED` interrompe gli invii in modo definitivo;
- la validazione dell'invio e ripetuta interamente lato server, senza fidarsi del client.

## Backend e API

### Moduli

Creare moduli separati e coerenti con l'architettura esistente:

- `lib/server/modules/questionnaires/{schema,dto,policy,repository,service}`;
- `lib/server/modules/questionnaire-responses/{schema,dto,repository,service}`;
- varianti `public` per repository, service, dto e schema quando i contratti pubblici differiscono dai contratti CMS.

I router tRPC restano di sola orchestrazione. Le regole di stato, validazione, privacy, aggregazione e unicita appartengono ai service; Prisma appartiene ai repository.

### Procedure CMS

- `questionnaires.list`;
- `questionnaires.getById`;
- `questionnaires.create`;
- `questionnaires.update`;
- `questionnaires.publish`;
- `questionnaires.close`;
- `questionnaires.archive`;
- `questionnaires.delete`;
- `questionnaireResponses.list`;
- `questionnaireResponses.getById`;
- `questionnaireResponses.exportCsv`.

Accesso policy-driven per `ADMIN` e `EDITOR`, salvo eventuali future decisioni specifiche sulla visibilita delle risposte. Ogni mutazione CMS produce audit log senza includere valori delle risposte.

### Procedure pubbliche

- recupero della definizione del questionario pubblicabile per slug;
- inizializzazione/lettura del token anonimo;
- submit della risposta;
- recupero aggregati pubblici solo per questionari `CLOSED`;
- recupero del dato necessario al blocco home.

Resta rispettata la regola tRPC-only. Per impostare il cookie, estendere in modo minimale la context/response metadata dell'adapter tRPC affinche una procedura pubblica possa aggiungere `Set-Cookie` alla risposta.

Cookie richiesto:

- token casuale ad alta entropia;
- hash persistito, token raw mai nel database;
- `HttpOnly`, `Secure`, `SameSite=Lax` in produzione;
- scope ristretto al questionario o a `/questionari`;
- scadenza coerente con la retention del questionario.

### Sicurezza e rate limit

- Nuova policy rate-limit piu stretta per submit pubblici.
- Il rate limit IP riduce l'abuso; il vincolo DB garantisce l'unicita contro richieste concorrenti.
- Redis resta obbligatorio in produzione e fallisce closed se non disponibile.
- Limitare dimensione del body e numero di campi prima della validazione profonda.
- Non inviare answers, token, ID risposta o altri dati personali a Umami o ad altri analytics.

## CMS

### Navigazione e rotte

Nuova voce CMS `Questionari` e rotte:

- `/cms/questionari`;
- `/cms/questionari/new`;
- `/cms/questionari/[id]/edit`;
- `/cms/questionari/[id]/risposte`.

Aggiornare `lib/cms/navigation.ts`, route helpers, i18n, prefetch server-side, React Query invalidation e revalidation delle pagine pubbliche interessate.

### Lista questionari

La lista contiene ricerca, filtri per stato, data, numero di risposte e azioni contestuali. Copre obbligatoriamente loading, empty, data, error e forbidden.

### Builder visuale

Il builder non deve essere un textarea JSON. Deve offrire:

- creazione, duplicazione, eliminazione e riordino drag-and-drop di step;
- creazione, duplicazione, eliminazione e riordino drag-and-drop di campi;
- catalogo dei tipi di campo;
- configurazione contestuale in pannello/accordion per tipo;
- ID generati automaticamente e visibili solo nel dettaglio tecnico;
- avvisi non invasivi per step vuoti, label mancanti, limiti e campi non aggregabili;
- preview interattiva del flusso pubblico;
- JSON in sola lettura come diagnostica avanzata, non come editor;
- dialog di conferma per azioni distruttive;
- blocco visivo e lato API dei controlli strutturali dopo il primo invio.

Il drag-and-drop deve avere alternativa tastiera/pulsanti di spostamento, come richiesto dall'accessibilita.

### Risposte CMS

La pagina risposte mostra tabella paginata con data invio e versione. Il dettaglio renderizza la risposta tramite lo snapshot della definizione per non dipendere da label correnti.

L'export CSV deve:

- essere generato lato server;
- avere limite e paginazione/streaming adeguati;
- usare intestazioni stabili con ID campo e label;
- serializzare le selezioni multiple in modo non ambiguo;
- rispettare autorizzazione e audit;
- non essere disponibile da endpoint pubblico.

## Esperienza pubblica

### Rotta dedicata

Creare `/questionari/[slug]`, con route App Router sottile, loader server dedicato e componente pagina pubblica dedicata.

La parte interattiva e un client component circoscritto al form. Il server invia solo definizione pubblica e metadati necessari, non codice CMS o dati di risposta.

### Flusso multi-step

- stepper con indicazione di avanzamento;
- indietro sempre disponibile verso gli step precedenti;
- avanti bloccato finche i required dello step corrente non sono validi;
- submit solo nell'ultimo step;
- focus sul primo errore e messaggi associati semanticamente ai controlli;
- valori conservati quando si torna indietro;
- stato di invio non duplicabile;
- schermata di conferma dopo invio;
- messaggio chiaro se l'utente ha gia risposto o il questionario e chiuso.

### Resume con IndexedDB

Estendere il database client esistente `middleware-client` con uno store versionato per bozze questionario.

Ogni record contiene:

- chiave `questionnaireId + definition.version`;
- step corrente;
- valori parziali;
- timestamp aggiornamento;
- metadati minimi di compatibilita.

Comportamento:

- scrittura debounced per evitare transazioni e render inutili;
- lettura solo nel browser e dopo hydration;
- eliminazione dopo submit riuscito;
- cleanup per scadenza e numero massimo di bozze;
- invalidazione della bozza quando cambia la versione della definizione;
- fallback silenzioso se IndexedDB non e disponibile.

Non usare localStorage per duplicare la bozza. Non salvare in IndexedDB valori che future policy identificheranno come altamente sensibili.

## Blocco home

### Regia

Estendere `Issue.homeBlocks` con il tipo `questionnaire`, che contiene un riferimento nullable al questionario. Il builder home esistente deve permettere selezione e preview compatta del questionario.

Regole:

- un questionario puo apparire al massimo una volta nella stessa regia home;
- blocchi vuoti sono consentiti in CMS ma non renderizzati pubblicamente;
- il blocco rispetta il variant dell'issue e non introduce un tema visivo separato;
- mutazioni di questionario e home invalidano la cache home e i tag pubblici pertinenti.

### Questionario aperto

Quando il questionario e `PUBLISHED`:

- colonna sinistra: lista di step/domande e stato di avanzamento;
- colonna destra: contenuto e controlli del passo corrente;
- su mobile: una sola colonna, con navigazione e azioni sempre raggiungibili;
- la logica di validazione e resume e condivisa con la pagina dedicata, non duplicata.

### Dashboard chiusa

Quando il questionario e `CLOSED`:

- colonna sinistra: lista delle sole domande autorizzate alla pubblicazione;
- colonna destra: dashboard aggregata per la domanda selezionata;
- nessun valore individuale, risposta testuale, identificativo o token arriva al client;
- i campi non pubblicabili non compaiono neppure nella lista.

Rappresentazioni suggerite:

| Tipo            | Dashboard                                                             |
| --------------- | --------------------------------------------------------------------- |
| Booleano        | conteggio e percentuale per valore                                    |
| Scelta singola  | distribuzione per opzione                                             |
| Scelta multipla | conteggio e percentuale per opzione                                   |
| Scala           | distribuzione, media, minimo e massimo quando statisticamente sensato |
| Numero          | conteggio, media, minimo, massimo e distribuzione semplificata        |
| Data/data-ora   | distribuzione temporale o riepilogo coerente con il contesto          |

La dashboard deve distinguere risposte totali e risposte valide per domanda.

## Privacy

Prima di raccogliere dati personali o potenzialmente sensibili, definire:

- informativa privacy e base giuridica;
- finalita esatta della raccolta;
- periodo di conservazione;
- gestione delle richieste di cancellazione/accesso;
- ruoli CMS autorizzati ad accedere alle risposte;
- eventuale necessità di consenso separato.

Una dashboard aggregata con pochi invii puo comunque rendere deducibile una risposta. Anche se la pubblicazione avviene solo a questionario chiuso, una soglia minima di risposte resta la misura raccomandata prima dell'esposizione pubblica. Se non adottata, il CMS deve almeno mostrare un avviso forte e richiedere conferma editoriale prima della chiusura.

## UI e UX

Tutta l'implementazione deve rispettare `docs/cms-ui.md` e il linguaggio visivo pubblico esistente.

### CMS

- Direzione editoriale, rigorosa, ad alto contrasto, senza effetti decorativi.
- Riutilizzare primitive CMS: `CmsPageHeader`, `CmsSurface`, `CmsFormField`, `CmsTextInput`, `CmsTextarea`, `CmsSelect`, `CmsCheckbox`, `CmsRadio`, `CmsToggle`, `CmsActionButton`, `CmsBadge`, `CmsStepper`.
- Non renderizzare primitive shadcn direttamente nei moduli CMS quando esiste il wrapper CMS obbligatorio.
- Usare Archivo per UI/label e Spectral per testi editoriali, con token esistenti.
- Nessuna utility `dark:*`; dark mode non supportato.
- Mobile sotto 768px a colonna singola; toolbar lista conforme al pattern search sempre visibile e filtri in Sheet.
- Stati per ogni pagina: loading, empty, data, error, forbidden, success feedback.

### Accessibilita

- Target minimo WCAG AA.
- Controlli nativi e label associate.
- Errori con testo, non solo colore, e `aria-describedby` dove necessario.
- Focus visibile secondo le regole CMS: border swap per input, outline esterno per bottoni e controlli.
- Navigazione da tastiera per form, stepper, dashboard e drag-and-drop; pulsanti alternativa al drag-and-drop.
- Annunci accessibili per cambio step, errori e submit riuscito.
- Nessuna dipendenza da hover per funzionalita essenziali.
- Rispettare `prefers-reduced-motion`.

### Performance

- RSC per caricamento di pagina e componenti client limitati a builder, form, resume e dashboard interattiva.
- Caricare dinamicamente solo eventuali visualizzazioni pesanti della dashboard.
- Non serializzare `definitionSnapshot` o risposte raw nel payload pubblico.
- Aggregare lato server; il browser non deve calcolare risultati da tutte le risposte.
- Scritture IndexedDB debounce e letture cacheate nel client.
- Evitare waterfall: caricare in parallelo dati indipendenti nelle pagine server.

## Revalidation, navigazione e SEO

- Aggiungere cache tags e funzioni di revalidation per questionari e home.
- Invalidare React Query per liste, dettagli, risposte e issue home dopo mutazioni rilevanti.
- Integrare i questionari pubblici nel sitemap soltanto quando pubblicati/chiusi e indicizzabili.
- Aggiungere metadata canonici per `/questionari/[slug]`.
- Il blocco home non necessita di un secondo URL o di dati duplicati.

## Piano di implementazione

1. Definire decisione di retention, limiti quantitativi e copy legale.
2. Aggiungere modelli Prisma, enum, migrazione e client generato.
3. Implementare schema Zod della definition, DTO e validatori deterministici per ogni tipo.
4. Implementare repository/service/policy per questionari e risposte, con transazioni per primo invio e unicita token.
5. Estendere context/adapter tRPC per il cookie anonimo e aggiungere policy rate-limit pubblica.
6. Registrare router CMS e pubblici, audit, output parsing e invalidazioni.
7. Implementare rotte e lista CMS.
8. Implementare builder visuale, preview e blocco strutturale post-prima-risposta.
9. Implementare pagina CMS risposte, dettaglio ed export CSV.
10. Implementare loader e pagina pubblica multi-step.
11. Implementare store IndexedDB e resume.
12. Estendere home blocks, loader home e renderer questionario/dashboard.
13. Integrare cache tags, sitemap, metadata, i18n e navigazione.
14. Eseguire test, quality gate e QA manuale desktop/mobile/tastiera.

## Test e QA

### Test unitari

- schema della definition e limiti;
- validazione di ogni tipo di campo;
- booleano `false` valido quando required;
- unicita di ID e opzioni;
- blocco modifiche strutturali dopo primo invio;
- transazione di submit e vincolo token;
- rifiuto submit da questionario chiuso/non pubblicato;
- aggregazione e whitelist privacy;
- serializzazione CSV;
- store IndexedDB: resume, cleanup, submit e cambio versione;
- regole del blocco home questionnaire.

### QA browser manuale

- Creare, pubblicare, chiudere e archiviare un questionario.
- Compilare su piu step, tornare indietro e verificare persistenza valori.
- Provare avanzamento con required mancanti.
- Ricaricare e verificare resume IndexedDB.
- Inviare e verificare rimozione della bozza e blocco del secondo invio.
- Verificare navigazione da tastiera, focus, messaggi errore e mobile.
- Verificare che il blocco home aperto compili e quello chiuso mostri solo aggregati autorizzati.
- Verificare che risposte raw non siano presenti nelle richieste o nel markup pubblico.
- Verificare lista, dettaglio e CSV CMS con versioni/snapshot corretti.

### Quality gate

Eseguire:

```bash
pnpm lint
pnpm typecheck
pnpm test:run
pnpm prisma:validate
pnpm build
```
