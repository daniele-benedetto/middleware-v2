# TODO CMS UI

## Premesse

- Punto 1: nel testo compare `dropdown`, ma il comportamento richiesto descrive piu chiaramente un `drag & drop` con long-press e salvataggio al drop. Da confermare prima di implementare.
- In `package.json` non c'e oggi una libreria DnD dedicata; valutare se usare interazione nativa o introdurre una dipendenza.

## 1. Riordino

- [x] Sostituire i pulsanti `su/giu` con un'interazione di drag & drop attivata solo su long-press della riga, non su click singolo.
- [x] Aggiungere un feedback visivo chiaro durante il trascinamento: riga attiva, placeholder, movimento delle righe, stato finale al drop.
- [x] Salvare automaticamente al drop.
- [x] Rimuovere la colonna `Reorder` dalle tabelle.
- [x] Rimuovere la modalita di reorder esplicita: pulsante `Modalita reorder`, pulsante `Salva ordine`, banner `reorderHelp`, logica `isReorderMode` e rami UI collegati dove non servono piu.
- [x] Verificare se mantenere o semplificare i guard rail che oggi limitano il reorder a liste complete e ordinate per posizione.
- [x] UI lista issues: `features/cms/issues/screens/issues-list-screen.tsx`
- [x] UI lista articles: `features/cms/articles/screens/articles-list-screen.tsx`
- [x] Toolbar articles con banner reorder: `features/cms/articles/components/articles-list-toolbar.tsx`
- [x] Hook condiviso reorder mode da sostituire o rifare: `features/cms/shared/hooks/use-reorder-mode.ts`
- [x] Riordino articoli dentro issue form: `features/cms/issues/screens/issue-form-screen.tsx`
- [x] Wrapper pannello articoli issue: `features/cms/issues/components/issue-articles-panel.tsx`
- [x] Pannello riutilizzabile con frecce `su/giu`: `components/cms/common/article-list-panel.tsx`
- [x] Skeleton pannello issue con controlli reorder: `features/cms/issues/components/issue-form-loading.tsx`
- [x] Skeleton riutilizzabile pannello articoli: `features/cms/shared/components/form-loading-primitives.tsx`
- [x] Testo UI reorder da ripulire: `lib/i18n/it/cms.ts`
- [x] Mutation/server gia esistenti da riusare o adattare: `lib/server/trpc/routers/issues.ts`, `lib/server/trpc/routers/articles.ts`, `lib/server/modules/issues/schema/index.ts`, `lib/server/modules/issues/service/index.ts`, `lib/server/modules/issues/repository/index.ts`, `lib/server/modules/articles/schema/index.ts`, `lib/server/modules/articles/service/index.ts`, `lib/server/modules/articles/repository/index.ts`, `lib/server/http/rate-limit.ts`
- [x] Test da riallineare: `tests/unit/lib/server/modules/issues/schema.test.ts`, `tests/unit/lib/server/modules/issues/service.test.ts`, `tests/unit/lib/server/modules/articles/schema.test.ts`, `tests/unit/lib/server/modules/articles/service.test.ts`

## 2. Prima colonna selezione riga

- [x] Portare la prima colonna di selezione a una larghezza pari a circa 2x il checkbox reale.
- [x] Centrare orizzontalmente e verticalmente il checkbox sia nell'header sia nel body.
- [x] Allineare il comportamento su tutte le tabelle che hanno selezione riga.
- [x] Riflettere la stessa geometria nello skeleton di loading.
- [x] Tabelle coinvolte: `features/cms/articles/screens/articles-list-screen.tsx`, `features/cms/issues/screens/issues-list-screen.tsx`, `features/cms/users/screens/users-list-screen.tsx`, `features/cms/shared/taxonomy/taxonomy-list-screen.tsx`
- [x] Classi tabella condivise da consolidare: `components/cms/primitives/data-table-shell.tsx`
- [x] Skeleton lista condiviso da aggiornare: `components/cms/common/list-loading-state.tsx`

## 3. Rimuovere la colonna ordine

- [x] Rimuovere la colonna ordine dove ancora presente nelle tabelle.
- [x] `issues`: rimuovere header `listText.table.order` e cella `sortOrder` da `features/cms/issues/screens/issues-list-screen.tsx`
- [x] `articles`: rimuovere header `listText.table.position` e cella `position` da `features/cms/articles/screens/articles-list-screen.tsx`
- [x] Aggiornare gli skeleton e i conteggi colonne loading: `app/(cms)/cms/issues/loading.tsx` (da `11` a `9` colonne), `app/(cms)/cms/articles/loading.tsx` (da `13` a `11` colonne), `components/cms/common/list-loading-state.tsx`
- [x] Ripulire label non piu usate in `lib/i18n/it/cms.ts`

## 4. Filtri mobile

- [ ] Non implementare subito: prima fare uno studio UX per un pattern ibrido mobile/desktop coerente.
- [ ] Mappare tutti i toolbar con filtri attuali e capire cosa puo diventare condiviso.
- [ ] Valutare un solo pattern che funzioni bene inline su desktop e in forma compatta/espandibile su mobile, senza duplicare due UI divergenti.
- [ ] Partire dal caso piu complesso `articles` e poi estendere agli altri list screen.
- [ ] File da studiare: `features/cms/articles/components/articles-list-toolbar.tsx`, `features/cms/issues/screens/issues-list-screen.tsx`, `features/cms/users/screens/users-list-screen.tsx`, `features/cms/shared/taxonomy/taxonomy-list-screen.tsx`, `features/cms/audit-logs/screens/audit-logs-list-screen.tsx`, `components/cms/primitives/form-controls.tsx`, `features/cms/shared/components/cms-list-search-input.tsx`, `components/cms/common/list-loading-state.tsx`

## 5. Calendario

- [x] Riscrivere da zero la UI del calendario per riallinearla al resto del CMS.
- [x] Rivedere trigger, popover, navigazione mese, stati giorno, selezione e clear action.
- [x] Valutare se estrarre un componente CMS dedicato invece di usare direttamente il wrapper generico attuale.
- [x] File da toccare: `features/cms/issues/screens/issue-form-screen.tsx`, `components/ui/calendar.tsx`

## 6. Altezza minima editor

- [x] Portare l'editor principale a `flex-1` come altezza minima, cosi prende tutta l'altezza disponibile della pagina e continua a crescere con il contenuto.
- [x] Rendere il comportamento opzionale, per distinguere editor full-height e editor compatti.
- [x] Applicare il comportamento full-height almeno a `article.contentRich`, `issue.description`, `taxonomy.description`.
- [x] Mantenere compatto `article.excerptRich`.
- [x] Aggiungere l'opzione nel componente editor e nel relativo lazy fallback.
- [x] Riflettere la differenza anche negli skeleton di loading.
- [x] File component editor: `components/cms/primitives/rich-text-editor.tsx`, `components/cms/primitives/rich-text-editor-lazy.tsx`
- [x] File form: `features/cms/articles/screens/article-form-screen.tsx`, `features/cms/issues/screens/issue-form-screen.tsx`, `features/cms/shared/taxonomy/taxonomy-form-screen.tsx`
- [x] File skeleton: `features/cms/shared/components/form-loading-primitives.tsx`, `features/cms/articles/components/article-form-loading.tsx`, `features/cms/issues/components/issue-form-loading.tsx`, `features/cms/shared/taxonomy/taxonomy-form-loading.tsx`
