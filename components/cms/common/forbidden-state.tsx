import { CmsBodyText, CmsEyebrow, CmsHeading, CmsSurface } from "@/components/cms/primitives";
import { i18n } from "@/lib/i18n";

export function CmsForbiddenState() {
  const text = i18n.cms.auth;

  return (
    <CmsSurface>
      <CmsEyebrow tone="accent">403</CmsEyebrow>
      <CmsHeading size="page" className="mt-2">
        {text.forbiddenTitle}
      </CmsHeading>
      <CmsBodyText className="mt-3">{text.forbiddenDescription}</CmsBodyText>
    </CmsSurface>
  );
}
