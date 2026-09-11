export default function PublicLoading() {
  return (
    <main
      id="main-content"
      className="flex min-h-svh flex-1 bg-background"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{i18n.public.loading.content}</span>
    </main>
  );
}
import { i18n } from "@/lib/i18n";
