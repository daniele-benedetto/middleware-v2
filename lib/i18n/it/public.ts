const articleCountLabel = (count: number) => `${count} ${count === 1 ? "articolo" : "articoli"}`;
const audioCountLabel = (count: number) => `${count} in versione audio`;
const lessonCountLabel = (count: number) => `${count} ${count === 1 ? "incontro" : "incontri"}`;
const paddedNumber = (value: number) => String(value).padStart(2, "0");

export const publicIt = {
  brand: {
    wordmark: "middleware",
    title: "Middleware",
    titleTemplate: (title: string) => `Middleware | ${title}`,
    description:
      "Middleware è un laboratorio di inchiesta militante a Modena. Ci occupiamo di territorio, conflitto sociale, trasformazioni urbane e contro-formazione.",
    keywords: [
      "Middleware",
      "inchiesta militante",
      "Modena",
      "Sacca",
      "Crocetta",
      "territorio",
      "conflitto sociale",
      "trasformazioni urbane",
      "contro-formazione",
      "inchiesta territoriale",
      "magazine indipendente",
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
  },
  home: {
    hero: {
      issueLabel: (order: number) => `Numero ${String(order).padStart(2, "0")}`,
    },
    editorial: {
      kicker: "Editoriale — il nodo da cui partire",
      cta: "Apri l'editoriale",
      ctaArrow: "→",
    },
    archive: {
      title: "Numeri precedenti",
      description:
        "Ogni numero raccoglie materiali, interviste e contributi attorno a un nodo di inchiesta.",
      archiveLabel: "Apri l'archivio →",
      countLabel: articleCountLabel,
    },
    articleCard: {
      readingTimeLabel: (minutes: number) => `${minutes} min`,
      audioLabel: "Versione audio",
    },
    closing: {
      fallback: "Una traccia conclusiva del percorso.",
    },
    dossier: {
      articlesLabel: "Materiali del numero",
      audioCountLabel,
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
        "Tutti i numeri di Middleware: inchieste, contributi e interviste per leggere territori, conflitti e processi.",
    },
    hero: {
      title: "Archivio [[Magazine]]",
      description:
        "I numeri pubblicati da Middleware raccolgono materiali di inchiesta, contro-formazione e restituzione collettiva. Ogni uscita apre un nodo di inchiesta, lo attraversa da prospettive diverse e lo rimette in circolazione come strumento di discussione.",
      totalLabel: (count: number) =>
        `${count} ${count === 1 ? "numero pubblicato" : "numeri pubblicati"}`,
    },
    countLabel: articleCountLabel,
    railAriaLabel: "Elenco dei numeri pubblicati",
    empty: {
      code: "00",
      kicker: "Archivio",
      title: "Nessun numero ancora pubblicato",
      description:
        "Quando un nodo di lavoro sarà pronto per essere restituito, comparirà qui come numero del magazine.",
    },
  },
  issuePage: {
    empty: {
      code: "404",
      kicker: "Uscita",
      title: "Numero non disponibile",
      description: "Il numero richiesto non è pubblicato o non è più disponibile nell'archivio.",
    },
  },
  articlePage: {
    audioCta: "Ascolta l'articolo",
    audioUnsupported: "Il tuo browser non supporta la riproduzione audio.",
    issuePrefix: "Dal numero:",
    viewIssue: "Apri il numero →",
  },
  listenPage: {
    backToArticle: "Torna all'articolo",
    title: "Audiolettura",
    notFoundTitle: "Audiolettura non trovata",
    metadataTitle: (title: string) => `Ascolta l'articolo: ${title}`,
    syncedText: "Testo in ascolto",
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
      title: "Contro-formazione",
      description:
        "Percorsi di contro-formazione collettiva per costruire strumenti comuni di lettura, inchiesta e intervento.",
    },
    hero: {
      title: "[[Contro-formazione]]",
      description:
        "La contro-formazione è lo spazio in cui rallentare, ragionare insieme, mettere a disposizione la propria conoscenza. Non teoria separate dalla pratica, ma momenti per costruire strumenti comuni di lettura, inchiesta e intervento.",
      totalLabel: (count: number) =>
        `${count} ${count === 1 ? "percorso di contro-formazione pubblicato" : "percorsi di contro-formazione pubblicati"}`,
    },
    lessonsCountLabel: lessonCountLabel,
    railAriaLabel: "Elenco dei momenti di contro-formazione collettiva pubblicati",
    empty: {
      code: "00",
      kicker: "Contro-formazione",
      title: "Nessun percorso pubblicato",
      description:
        "Quando un percorso di contro-formazione sarà pronto, comparirà qui con i suoi incontri.",
    },
  },
  coursePage: {
    lessonsHeading: "Incontri",
    lessonsCountLabel: lessonCountLabel,
    readingTimeLabel: (minutes: number) => `${minutes} min`,
    audioLabel: "Audio",
    archive: {
      title: "Altri percorsi",
      description: "Continua ad attraversare gli altri percorsi di contro-formazione pubblicati.",
      archiveLabel: "Tutti i percorsi",
    },
    empty: {
      code: "404",
      kicker: "Contro-formazione",
      title: "Percorso non disponibile",
      description: "Il momento di contro-formazione richiesto non è disponibile.",
    },
  },
  lessonPage: {
    audioCta: "Ascolta l'incontro",
    backToCourse: "Torna alla contro-formazione",
    otherLessonsTitle: "Altri incontri",
    viewCourse: "Visualizza la contro-formazione  →",
    previousLabel: "Incontro precedente",
    nextLabel: "Incontro successivo",
    lessonLabel: (value: number) => `Incontro ${paddedNumber(value)}`,
    readingTimeLabel: (minutes: number) => `${minutes} min`,
    audioLabel: "Audio",
    listen: {
      backToLesson: "Torna all'incontro",
      metadataTitle: (title: string) => `Ascolta l'incontro: ${title}`,
      notFoundTitle: "Audiolettura non trovata",
    },
  },
  metadata: {
    staticPageNotFound: "Pagina non trovata",
    issueNotFound: "Uscita non trovata",
    articleNotFound: "Articolo non trovato",
    courseNotFound: "Contro-formazione non trovata",
    lessonNotFound: "Incontro non trovato",
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
    acknowledge: {
      title: "Statistiche senza profilazione",
      description:
        "Usiamo statistiche cookieless e aggregate per capire quali contenuti vengono letti, da dove arrivano le visite e come migliorare il lavoro editoriale. Non usiamo cookie di profilazione, pubblicità, remarketing o identificatori personali. La presa visione viene salvata su questo dispositivo fino alla scadenza o al prossimo aggiornamento delle informative.",
    },
    consent: {
      title: "Preferenze privacy",
      description:
        "Usiamo statistiche cookieless e aggregate per capire quali contenuti vengono letti, da dove arrivano le visite e come migliorare il lavoro editoriale. Non usiamo cookie di profilazione, pubblicità, remarketing o identificatori personali. Puoi consentire o rifiutare queste misurazioni: la scelta viene salvata su questo dispositivo fino alla scadenza o al prossimo aggiornamento delle informative.",
    },
    privacyLink: "Privacy policy",
    cookieLink: "Cookie policy",
    understand: "Ho capito",
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
    legal: `© ${new Date().getFullYear()} Middleware — Laboratorio di inchiesta militante`,
    issueMeta: "I contenuti possono circolare, essere discussi e riutilizzati.",
  },
} as const;
