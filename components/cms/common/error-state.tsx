import { CmsActionButton } from "@/components/cms/primitives/action-button";
import { CmsSurface } from "@/components/cms/primitives/surface";
import { CmsBody, CmsDisplay, CmsMetaText } from "@/components/cms/primitives/typography";

type CmsErrorStateProps = {
  title: string;
  description: string;
  retryLabel?: string;
  onRetry?: () => void;
};

export function CmsErrorState({ title, description, retryLabel, onRetry }: CmsErrorStateProps) {
  return (
    <CmsSurface border="default" spacing="xl" className="flex flex-col items-start gap-[12px]">
      <CmsMetaText variant="category" className="block">
        ERRORE
      </CmsMetaText>
      <CmsDisplay as="h2" size="h2">
        {title}
      </CmsDisplay>
      <CmsBody size="md" tone="foreground" className="max-w-[520px]">
        {description}
      </CmsBody>
      {onRetry ? (
        <CmsActionButton variant="outline-accent" size="md" onClick={onRetry} className="mt-[6px]">
          → {retryLabel ?? "Riprova"}
        </CmsActionButton>
      ) : null}
    </CmsSurface>
  );
}
