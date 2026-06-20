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
      { number: "01", label: "Numero corrente", href: "#top" },
      { number: "02", label: "Archivio", href: "#archivio" },
      { number: "03", label: "Chi siamo", href: "#footer" },
      { number: "04", label: "Contatti", href: "#footer" },
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
      description: "l'archivio è organizzato per numeri, non per articoli sciolti",
      cta: "Apri il numero →",
      countLabel: (count: number) => `${count} ${count === 1 ? "pezzo" : "pezzi"}`,
    },
    articleCard: {
      readingTimeLabel: (minutes: number) => `${minutes} min`,
      audioLabel: "Audio",
    },
    sectionGrid: {
      showAll: (count: number) => `Vedi tutti (${count})`,
      showLess: "Riduci",
    },
    empty: {
      kicker: "Numero corrente",
      title: "Nessun numero pubblicato",
      description:
        "Quando un numero sarà pubblicato nel CMS, la home verrà composta dai suoi contenuti.",
    },
  },
  footer: {
    sections: {
      title: "Sezioni",
      links: [
        { label: "Numero corrente", href: "#top" },
        { label: "Archivio", href: "#archivio" },
        { label: "Chi siamo", href: "#footer" },
        { label: "Contatti", href: "#footer" },
      ],
    },
    social: {
      title: "Social",
      links: [
        { label: "Instagram", href: "#footer" },
        { label: "Telegram", href: "#footer" },
        { label: "Mastodon", href: "#footer" },
      ],
    },
    legal: "© 2025 Middleware — rivista politico-editoriale",
    issueMeta: "I contenuti sono liberamente utilizzabili.",
  },
} as const;
