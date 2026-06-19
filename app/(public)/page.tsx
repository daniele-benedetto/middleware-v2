import { PublicFooter, PublicHeader } from "@/components/public";

export default function PublicHomePage() {
  return (
    <main id="top" className="flex flex-1 flex-col bg-background text-foreground">
      <PublicHeader />
      <div className="flex-1" />
      <PublicFooter />
    </main>
  );
}
