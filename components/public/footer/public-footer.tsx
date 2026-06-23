import { PublicFooterBottomBar } from "@/components/public/footer/public-footer-bottom-bar";
import { PublicFooterBrand } from "@/components/public/footer/public-footer-brand";
import { PublicFooterLinkGroup } from "@/components/public/footer/public-footer-link-group";
import { publicContentClassName } from "@/components/public/primitives";
import { i18n } from "@/lib/i18n";

export function PublicFooter() {
  const text = i18n.public.footer;

  return (
    <footer
      className="bg-foreground text-background"
      style={{ viewTransitionName: "public-footer" }}
    >
      <div
        className={`${publicContentClassName} grid grid-cols-1 gap-9 pt-13 pb-10 md:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]`}
      >
        <PublicFooterBrand />
        <PublicFooterLinkGroup title={text.sections.title} links={text.sections.links} />
        <PublicFooterLinkGroup title={text.legalPages.title} links={text.legalPages.links} />
      </div>

      <PublicFooterBottomBar legal={text.legal} issueMeta={text.issueMeta} />
    </footer>
  );
}
