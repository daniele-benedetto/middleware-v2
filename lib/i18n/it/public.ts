export const publicIt = {
  brand: {
    wordmark: "middleware",
    logoAlt: "",
    homeAriaLabel: "Torna all'inizio",
  },
  header: {
    openMenu: "Menu",
    openMenuAriaLabel: "Apri menu",
  },
  menu: {
    dialogAriaLabel: "Menu principale",
    close: "Chiudi",
    closeAriaLabel: "Chiudi menu",
    quote: "La conoscenza è legata alla lotta. Conosce veramente chi veramente odia.",
    quoteSource: "In memoria di Mario Tronti.",
    items: [
      { number: "01", label: "Numero corrente", href: "/" },
      { number: "02", label: "Archivio", href: "/uscite" },
      { number: "03", label: "Chi siamo", href: "/chi-siamo" },
    ],
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
      countLabel: (count: number) => `${count} ${count === 1 ? "articolo" : "articoli"}`,
    },
    articleCard: {
      readingTimeLabel: (minutes: number) => `${minutes} min`,
      audioLabel: "Audio",
    },
    closing: {
      fallback: "Ultimo movimento del dossier.",
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
    hero: {
      title: "Archivio [[Magazine]]",
      description:
        "Ogni numero nasce attorno a un campo di tensione. Non raccoglie articoli sciolti, ma costruisce un'inchiesta monografica: un attraversamento di conflitti, linguaggi e immaginari che prova a far emergere ciò che nel presente resta disperso, opaco, conteso. L'archivio custodisce queste uscite come dossier da riaprire, mappe parziali per leggere le forme del potere, del lavoro, della cultura e della trasformazione sociale.",
      totalLabel: (count: number) =>
        `${count} ${count === 1 ? "numero pubblicato" : "numeri pubblicati"}`,
    },
    countLabel: (count: number) => `${count} ${count === 1 ? "articolo" : "articoli"}`,
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
  footer: {
    sections: {
      title: "Sezioni",
      links: [
        { label: "Numero corrente", href: "/" },
        { label: "Archivio", href: "/uscite" },
        { label: "Chi siamo", href: "/chi-siamo" },
      ],
    },
    legalPages: {
      title: "Legale",
      links: [
        { label: "Privacy policy", href: "/privacy-policy" },
        { label: "Cookie policy", href: "/cookie-policy" },
      ],
    },
    legal: `© ${new Date().getFullYear()} Middleware — Laboratorio di inchiesta`,
    issueMeta: "I contenuti sono liberamente utilizzabili.",
  },
} as const;
