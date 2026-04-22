import { CmsBody, CmsDisplay, CmsMetaText, CmsSurface } from "@/components/cms/primitives";
import { i18n } from "@/lib/i18n";

export function CmsForbiddenState() {
  const text = i18n.cms.auth;

  return (
    <CmsSurface border="strong" spacing="xl" className="flex flex-col items-start gap-[12px]">
      <CmsMetaText variant="category" className="block">
        403
      </CmsMetaText>
      <CmsDisplay as="h1" size="h1">
        {text.forbiddenTitle}
      </CmsDisplay>
      <CmsBody size="md" tone="foreground" className="max-w-[520px]">
        {text.forbiddenDescription}
      </CmsBody>
    </CmsSurface>
  );
}
