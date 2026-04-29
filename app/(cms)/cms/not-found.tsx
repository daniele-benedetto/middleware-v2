import { CmsSystemActionLink, CmsSystemScreen } from "@/components/cms/common";
import { i18n } from "@/lib/i18n";

export default function CmsNotFound() {
  const text = i18n.cms.system;

  return (
    <CmsSystemScreen
      code={text.notFoundCode}
      title={text.notFoundTitle}
      description={text.notFoundDescription}
      actions={
        <>
          <CmsSystemActionLink href="/cms" tone="accent">
            {text.goHome}
          </CmsSystemActionLink>
        </>
      }
    />
  );
}
