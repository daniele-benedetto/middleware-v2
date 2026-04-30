import { CmsShellSystemState } from "@/components/cms/common/shell-system-state";
import { i18n } from "@/lib/i18n";

export function CmsForbiddenState() {
  const text = i18n.cms.auth;

  return (
    <CmsShellSystemState
      code="403"
      title={text.forbiddenTitle}
      description={text.forbiddenDescription}
    />
  );
}
