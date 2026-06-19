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
      { number: "01", label: "Uscite", href: "/uscite" },
      { number: "02", label: "Archivio", href: "/archivio" },
      { number: "03", label: "Podcast", href: "/podcast" },
      { number: "04", label: "Chi siamo", href: "/chi-siamo" },
    ],
  },
  footer: {
    sections: {
      title: "Sezioni",
      links: [
        { label: "Uscite", href: "/uscite" },
        { label: "Archivio", href: "/archivio" },
        { label: "Categorie", href: "/categorie" },
        { label: "Tag", href: "/tag" },
        { label: "Podcast", href: "/podcast" },
        { label: "Chi siamo", href: "/chi-siamo" },
        { label: "Privacy policy", href: "/privacy-policy" },
        { label: "Cookie policy", href: "/cookie-policy" },
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
