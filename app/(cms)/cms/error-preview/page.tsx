import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: "Error Preview",
  description: "Route tecnica per visualizzare la pagina errore CMS.",
  path: "/cms/error-preview",
});

export default function CmsErrorPreviewPage() {
  throw new Error("Preview errore CMS");
}
