import { CmsShellSystemState } from "@/components/cms/common/shell-system-state";
import { CmsSystemActionButton } from "@/components/cms/common/system-screen";
import { i18n } from "@/lib/i18n";

type CmsErrorStateProps = {
  title: string;
  description: string;
  retryLabel?: string;
  onRetry?: () => void;
};

export function CmsErrorState({ title, description, retryLabel, onRetry }: CmsErrorStateProps) {
  const text = i18n.cms.common;

  return (
    <CmsShellSystemState
      eyebrow={text.errorEyebrow}
      title={title}
      description={description}
      actions={
        onRetry ? (
          <CmsSystemActionButton onClick={onRetry} tone="accent">
            {retryLabel ?? text.retry}
          </CmsSystemActionButton>
        ) : undefined
      }
    />
  );
}
