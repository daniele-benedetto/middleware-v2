ALTER TABLE "pages" ADD COLUMN "titleStyled" jsonb;

UPDATE "pages"
SET
  "titleStyled" = $$[{"text":"Chi ","tone":"default"},{"text":"siamo","tone":"primary"}]$$::jsonb,
  "contentRich" = $$
  {
    "type": "doc",
    "content": [
      {"type":"paragraph","content":[{"type":"text","text":"Middleware e un laboratorio editoriale indipendente: un luogo di inchiesta, ricerca politica, cultura visuale e conflitto delle idee. Questa pagina contiene testo volutamente esteso per testare ritmo, leggibilita, scroll e resa tipografica del frontend pubblico."}]},
      {"type":"paragraph","content":[{"type":"text","text":"Il progetto nasce per tenere insieme analisi lunghe, interventi rapidi e costruzione di immaginari. La forma sito deve quindi reggere pagine istituzionali dense senza perdere il carattere grafico della home."}]},
      {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Perche Middleware"}]},
      {"type":"paragraph","content":[{"type":"text","text":"Middleware non vuole essere soltanto una testata o un archivio. Funziona come infrastruttura editoriale: raccoglie materiali, li attraversa, li mette in relazione e prova a renderli accessibili senza normalizzarli."}]},
      {"type":"paragraph","content":[{"type":"text","text":"Il nome indica uno spazio intermedio. Tra ricerca e divulgazione, tra militanza e produzione culturale, tra documento e racconto. In questo spazio il lavoro redazionale costruisce numeri, dossier e pagine statiche che devono restare leggibili nel tempo."}]},
      {"type":"blockquote","content":[{"type":"paragraph","content":[{"type":"text","text":"Una pagina istituzionale non deve sembrare un documento morto: deve continuare il tono del sito e rendere chiaro come il progetto si presenta."}]}]},
      {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Cosa facciamo"}]},
      {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Costruiamo dossier tematici organizzati per numeri editoriali."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Pubblichiamo articoli, materiali audio, immagini e apparati critici."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Manteniamo un CMS essenziale per aggiornare pagine, media e contenuti senza dipendere da interventi tecnici continui."}]}]}]},
      {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Test di corpo lungo"}]},
      {"type":"paragraph","content":[{"type":"text","text":"Questo paragrafo serve a stressare la composizione su desktop e mobile. Il testo continua per simulare una pagina reale: una redazione descrive le proprie pratiche, i propri strumenti, le forme di collaborazione e il modo in cui i materiali vengono selezionati, discussi, editati e pubblicati."}]},
      {"type":"paragraph","content":[{"type":"text","text":"La pagina deve restare solida quando contiene molte sezioni, liste, citazioni e immagini. Il frontend deve preservare il carattere grafico della home, ma senza sacrificare la lettura dei testi lunghi."}]},
      {"type":"paragraph","content":[{"type":"text","text":"Il contenuto qui presente e modificabile dal CMS: titoli, accenti, paragrafi e in seguito immagini selezionate dalla libreria media possono essere aggiornati senza cambiare codice."}]}
    ]
  }
  $$::jsonb,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'chi-siamo';

UPDATE "pages"
SET
  "titleStyled" = $$[{"text":"Cookie ","tone":"default"},{"text":"policy","tone":"primary"}]$$::jsonb,
  "contentRich" = $$
  {
    "type": "doc",
    "content": [
      {"type":"paragraph","content":[{"type":"text","text":"Questa cookie policy contiene testo riempitivo esteso per verificare la resa delle pagine legali pubbliche. Deve essere sostituita o rifinita prima della pubblicazione definitiva dei testi normativi."}]},
      {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Cosa sono i cookie"}]},
      {"type":"paragraph","content":[{"type":"text","text":"I cookie sono piccoli file che un sito puo salvare nel browser per ricordare informazioni tecniche, preferenze o dati necessari al funzionamento di alcuni servizi. In questa fase il testo serve a simulare una policy completa."}]},
      {"type":"paragraph","content":[{"type":"text","text":"Una pagina di policy reale dovrebbe distinguere tra cookie tecnici, cookie analitici, servizi terzi e strumenti di consenso. La struttura qui proposta permette di testare titoli, paragrafi, liste e citazioni."}]},
      {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Categorie di test"}]},
      {"type":"orderedList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Cookie tecnici necessari alla navigazione e alla sicurezza."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Cookie di preferenza usati per ricordare impostazioni scelte dall utente."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Eventuali cookie di terze parti da dichiarare con finalita, durata e base giuridica."}]}]}]},
      {"type":"blockquote","content":[{"type":"paragraph","content":[{"type":"text","text":"Questo blocco serve solo a controllare che una citazione in una pagina legale mantenga stile editoriale coerente con il sito."}]}]},
      {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Gestione preferenze"}]},
      {"type":"paragraph","content":[{"type":"text","text":"Il testo definitivo dovra spiegare come modificare o revocare il consenso, come configurare il browser e quali conseguenze puo avere la disattivazione di alcuni strumenti."}]},
      {"type":"paragraph","content":[{"type":"text","text":"Aggiungiamo ancora contenuto per simulare una policy lunga: informazioni sul titolare, contatti, periodo di conservazione, aggiornamenti del documento, link ai provider esterni e modalita per ottenere chiarimenti."}]}
    ]
  }
  $$::jsonb,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'cookie-policy';

UPDATE "pages"
SET
  "titleStyled" = $$[{"text":"Privacy ","tone":"default"},{"text":"policy","tone":"primary"}]$$::jsonb,
  "contentRich" = $$
  {
    "type": "doc",
    "content": [
      {"type":"paragraph","content":[{"type":"text","text":"Questa privacy policy e una base lunga di test. Serve a verificare come il frontend gestisce pagine dense, sezioni ripetute, liste e contenuti legali senza introdurre meta informazioni inutili nella UI."}]},
      {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Titolare e finalita"}]},
      {"type":"paragraph","content":[{"type":"text","text":"Il testo definitivo dovra indicare il titolare del trattamento, i dati raccolti, le finalita, le basi giuridiche, i tempi di conservazione e i diritti esercitabili dagli utenti."}]},
      {"type":"paragraph","content":[{"type":"text","text":"Per i test inseriamo un corpo ampio: accesso al sito, eventuali richieste di contatto, iscrizione a strumenti editoriali, protezione da abusi, statistiche tecniche e gestione dei contenuti multimediali."}]},
      {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Dati trattati"}]},
      {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Dati tecnici generati dalla navigazione, come log e informazioni di sicurezza."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Dati comunicati volontariamente tramite eventuali moduli o indirizzi di contatto."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Dati necessari alla gestione di preferenze, consenso e comunicazioni editoriali."}]}]}]},
      {"type":"blockquote","content":[{"type":"paragraph","content":[{"type":"text","text":"La privacy policy deve essere leggibile, aggiornata e coerente con le funzioni realmente attive sul sito."}]}]},
      {"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Diritti degli utenti"}]},
      {"type":"paragraph","content":[{"type":"text","text":"Gli utenti possono chiedere accesso, rettifica, cancellazione, limitazione, opposizione e portabilita nei casi previsti. Il testo definitivo dovra indicare canali e tempi di risposta."}]},
      {"type":"paragraph","content":[{"type":"text","text":"Questa sezione chiude il contenuto di prova con un ultimo paragrafo lungo, utile per valutare spaziature, scroll, rendering server side e comportamento su dispositivi mobili."}]}
    ]
  }
  $$::jsonb,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'privacy-policy';
