import { CmsListLoadingState } from "@/components/cms/common";

export default function CmsCategoriesLoading() {
  return <CmsListLoadingState columns={5} filterColumns={1} hiddenButton={true} />;
}
