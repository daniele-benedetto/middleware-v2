import { CmsActionButton } from "@/components/cms/primitives/action-button";
import { CmsSurface } from "@/components/cms/primitives/surface";
import { CmsBody, CmsDisplay, CmsMetaText } from "@/components/cms/primitives/typography";
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
    <CmsSurface border="default" spacing="xl" className="flex flex-col items-start gap-3">
      <CmsMetaText variant="category" className="block">
        {text.errorEyebrow}
      </CmsMetaText>
      <CmsDisplay as="h2" size="h2">
        {title}
      </CmsDisplay>
      <CmsBody size="md" tone="foreground" className="max-w-130">
        {description}
      </CmsBody>
      {onRetry ? (
        <CmsActionButton variant="outline-accent" size="md" onClick={onRetry} className="mt-1.5">
          → {retryLabel ?? text.retry}
        </CmsActionButton>
      ) : null}
    </CmsSurface>
  );
}
