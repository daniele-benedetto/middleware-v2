// Policy alt immagini editoriali (A11Y-6): un'immagine editoriale senza `imageAlt`
// è trattata come DECORATIVA → `alt=""`. Il significato è già veicolato dall'heading
// (`<h2>`/`<h3>`) accanto all'immagine, quindi un alt vuoto è intenzionale, non una svista.
// Unico punto in cui questa scelta è codificata: cambiarla qui la cambia ovunque.
export function editorialImageAlt(imageAlt: string | null | undefined): string {
  return imageAlt ?? "";
}
