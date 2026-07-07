const articleCountLabel = (count: number) => `${count} ${count === 1 ? "articolo" : "articoli"}`;
const lessonCountLabel = (count: number) => `${count} ${count === 1 ? "lezione" : "lezioni"}`;
const paddedNumber = (value: number) => String(value).padStart(2, "0");

export const publicIt = {
  brand: {
    wordmark: "middleware",
    title: "Middleware",
    titleTemplate: (title: string) => `Middleware | ${title}`,
    description:
      "Middleware è un laboratorio di inchiesta a Modena: territorio, conflitto sociale, trasformazioni urbane e politica dal basso.",
    keywords: [
      "Middleware",
      "laboratorio di inchiesta",
      "Modena",
      "territorio",
      "conflitto sociale",
      "trasformazioni urbane",
      "politica dal basso",
      "inchiesta territoriale",
    ],
    logoAlt: "",
    homeAriaLabel: "Torna all'inizio",
  },
  header: {
    skipToContent: "Salta al contenuto principale",
    openMenu: "Menu",
    openMenuAriaLabel: "Apri menu",
  },
  menu: {
    dialogAriaLabel: "Menu principale",
    close: "Chiudi",
    closeAriaLabel: "Chiudi menu",
    quote_1: "La conoscenza è legata alla lotta.",
    quote_2: "Conosce veramente chi veramente odia.",
    quoteSource: "In memoria di Mario Tronti.",
  },
  home: {
    hero: {
      issueLabel: (order: number) => `Numero ${String(order).padStart(2, "0")}`,
    },
    editorial: {
      kicker: "Editoriale — l'apertura del numero",
      cta: "Apri l'editoriale",
      ctaArrow: "→",
    },
    archive: {
      title: "Altri numeri",
      description: "",
      archiveLabel: "Archivio Magazine →",
      countLabel: articleCountLabel,
    },
    articleCard: {
      readingTimeLabel: (minutes: number) => `${minutes} min`,
      audioLabel: "Audio",
    },
    closing: {
      fallback: "Ultimo movimento del dossier.",
    },
    dossier: {
      articlesLabel: "Articoli del numero",
    },
    sectionGrid: {
      showAll: (count: number) => `Vedi tutti (${count})`,
      showLess: "Riduci",
    },
    empty: {
      code: "404",
      kicker: "Numero corrente",
      title: "Nessun numero pubblicato",
      description: "Quando un numero sarà pubblicato, la home verrà composta dai suoi contenuti.",
    },
  },
  issuesArchive: {
    metadata: {
      title: "Archivio Magazine",
      description:
        "Tutti i numeri pubblicati da Middleware, organizzati come uscite editoriali e dossier completi.",
    },
    hero: {
      title: "Archivio [[Magazine]]",
      description:
        "Ogni numero nasce attorno a un campo di tensione. Non raccoglie articoli sciolti, ma costruisce un'inchiesta monografica: un attraversamento di conflitti, linguaggi e immaginari che prova a far emergere ciò che nel presente resta disperso, opaco, conteso. L'archivio custodisce queste uscite come dossier da riaprire, mappe parziali per leggere le forme del potere, del lavoro, della cultura e della trasformazione sociale.",
      totalLabel: (count: number) =>
        `${count} ${count === 1 ? "numero pubblicato" : "numeri pubblicati"}`,
    },
    countLabel: articleCountLabel,
    railAriaLabel: "Elenco dei numeri pubblicati",
    empty: {
      code: "00",
      kicker: "Archivio",
      title: "Nessuna uscita pubblicata",
      description: "Quando i numeri saranno pubblicati, compariranno qui in ordine cronologico.",
    },
  },
  issuePage: {
    empty: {
      code: "404",
      kicker: "Uscita",
      title: "Numero non trovato",
      description: "Il numero richiesto non è disponibile nell'archivio.",
    },
  },
  articlePage: {
    audioCta: "Ascolta l'articolo",
    audioUnsupported: "Il tuo browser non supporta la riproduzione audio.",
    issuePrefix: "Dal numero:",
    viewIssue: "Visualizza il numero  →",
  },
  listenPage: {
    backToArticle: "Torna all'articolo",
    title: "Ascolta l'articolo",
    notFoundTitle: "Audiolettura non trovata",
    metadataTitle: (title: string) => `Ascolta l'articolo: ${title}`,
    syncedText: "Testo sincronizzato",
    playingStatus: "Audiolettura in riproduzione",
    pausedStatus: "Audiolettura in pausa",
    resumeFrom: (time: string) => `Riprendi da ${time}`,
    progressAriaLabel: "Avanzamento audiolettura",
    progressValueText: (current: string, duration: string) => `${current} di ${duration}`,
    seekBackward: "Torna indietro di 15 secondi",
    play: "Avvia audiolettura",
    pause: "Metti in pausa",
    seekForward: "Vai avanti di 15 secondi",
    speed: (rate: number) => `Velocità ${rate}x`,
    restart: "Ricomincia",
    playbackError: "Non riesco ad avviare l'audio. Riprova tra poco.",
  },
  formazione: {
    metadata: {
      title: "Formazione",
      description:
        "I corsi di Middleware: percorsi di formazione in lezioni, per attraversare strumenti, linguaggi e pratiche dell'inchiesta.",
    },
    hero: {
      title: "[[Formazione]]",
      description:
        "Non lezioni isolate, ma percorsi. Ogni corso costruisce un attraversamento progressivo: strumenti di analisi, linguaggi del conflitto e pratiche dell'inchiesta, messi in sequenza per essere ripresi, ascoltati e rimessi in movimento.",
      totalLabel: (count: number) =>
        `${count} ${count === 1 ? "corso pubblicato" : "corsi pubblicati"}`,
    },
    lessonsCountLabel: lessonCountLabel,
    empty: {
      code: "00",
      kicker: "Formazione",
      title: "Nessun corso pubblicato",
      description: "Quando un corso sarà pubblicato, comparirà qui con le sue lezioni.",
    },
  },
  coursePage: {
    lessonsHeading: "Lezioni del corso",
    lessonsCountLabel: lessonCountLabel,
    readingTimeLabel: (minutes: number) => `${minutes} min`,
    audioLabel: "Audio",
    empty: {
      code: "404",
      kicker: "Corso",
      title: "Corso non trovato",
      description: "Il corso richiesto non è disponibile.",
    },
  },
  lessonPage: {
    audioCta: "Ascolta la lezione",
    backToCourse: "Torna al corso",
    otherLessonsTitle: "Altre lezioni del corso",
    viewCourse: "Visualizza il corso  →",
    previousLabel: "Lezione precedente",
    nextLabel: "Lezione successiva",
    lessonLabel: (value: number) => `Lezione ${paddedNumber(value)}`,
    readingTimeLabel: (minutes: number) => `${minutes} min`,
    audioLabel: "Audio",
    listen: {
      backToLesson: "Torna alla lezione",
      metadataTitle: (title: string) => `Ascolta la lezione: ${title}`,
      notFoundTitle: "Audiolettura non trovata",
    },
  },
  metadata: {
    staticPageNotFound: "Pagina non trovata",
    issueNotFound: "Uscita non trovata",
    articleNotFound: "Articolo non trovato",
    courseNotFound: "Corso non trovato",
    lessonNotFound: "Lezione non trovata",
  },
  issueFormat: {
    monthsShort: [
      "Gen",
      "Feb",
      "Mar",
      "Apr",
      "Mag",
      "Giu",
      "Lug",
      "Ago",
      "Set",
      "Ott",
      "Nov",
      "Dic",
    ],
    seasons: {
      spring: "Primavera",
      summer: "Estate",
      autumn: "Autunno",
      winter: "Inverno",
    },
    number: (positionFromOldest: number) => `N. ${String(positionFromOldest).padStart(2, "0")}`,
  },
  staticPage: {
    updatedPrefix: "Ultimo aggiornamento:",
  },
  cookieConsent: {
    kicker: "Privacy e cookie",
    title: "Preferenze di riservatezza",
    description:
      "Questo sito utilizza cookie tecnici necessari e strumenti di misurazione cookieless per statistiche aggregate e anonime, senza cookie di profilazione o pubblicitari. Puoi consentire o rifiutare queste misurazioni: la scelta viene salvata su questo dispositivo fino alla scadenza o al prossimo aggiornamento delle informative.",
    privacyLink: "Privacy policy",
    cookieLink: "Cookie policy",
    accept: "Consenti",
    reject: "Rifiuta",
  },
  labels: {
    articleCount: articleCountLabel,
  },
  footer: {
    sections: {
      title: "Sezioni",
    },
    legalPages: {
      title: "Legale",
    },
    legal: `© ${new Date().getFullYear()} Middleware — Laboratorio di inchiesta`,
    issueMeta: "I contenuti sono liberamente utilizzabili.",
  },
} as const;
