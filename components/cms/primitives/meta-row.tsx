import { CmsEyebrow } from "@/components/cms/primitives/typography";

type CmsMetaRowProps = {
  label: string;
  value: string;
};

export function CmsMetaRow({ label, value }: CmsMetaRowProps) {
  return (
    <span className="inline-flex items-center gap-1 border border-foreground px-2 py-1">
      <CmsEyebrow>{label}:</CmsEyebrow>
      <CmsEyebrow>{value}</CmsEyebrow>
    </span>
  );
}
