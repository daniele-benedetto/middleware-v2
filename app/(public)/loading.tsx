export default function PublicLoading() {
  return (
    <main
      id="main-content"
      className="flex min-h-svh flex-1 bg-background"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Caricamento contenuti in corso.</span>
    </main>
  );
}
