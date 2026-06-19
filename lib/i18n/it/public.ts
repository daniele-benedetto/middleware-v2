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
      { number: "01", label: "Middleware", href: "#top" },
      { number: "02", label: "About", href: "#footer" },
      { number: "03", label: "Archivio", href: "#archivio" },
    ],
  },
  footer: {
    sections: {
      title: "Sezioni",
      links: [
        { label: "Middleware", href: "#top" },
        { label: "About", href: "#footer" },
        { label: "Archivio", href: "#archivio" },
      ],
    },
    social: {
      title: "Social",
      links: [
        { label: "Instagram", href: "#footer" },
        { label: "Facebook", href: "#footer" },
      ],
    },
    legal: "© 2025 Middleware — Laboratorio di inchiesta",
    issueMeta: "I contenuti sono liberamente utilizzabili.",
  },
} as const;
