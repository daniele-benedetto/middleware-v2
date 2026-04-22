import { CmsBodyText, CmsHeading, CmsSurface } from "@/components/cms/primitives";

type CmsEmptyStateProps = {
  title: string;
  description: string;
};

export function CmsEmptyState({ title, description }: CmsEmptyStateProps) {
  return (
    <CmsSurface border="default" className="text-center">
      <CmsHeading size="section">{title}</CmsHeading>
      <CmsBodyText className="mt-3">{description}</CmsBodyText>
    </CmsSurface>
  );
}
