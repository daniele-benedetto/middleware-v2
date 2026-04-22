import { CmsResourcePage } from "@/components/cms/pages";
import { toResourceCopy } from "@/features/cms/resources/mappers/to-resource-copy";

import type { CmsResourceKey } from "@/features/cms/resources/mappers/to-resource-copy";

type CmsResourceScreenProps = {
  resource: CmsResourceKey;
};

export function CmsResourceScreen({ resource }: CmsResourceScreenProps) {
  const copy = toResourceCopy(resource);

  return <CmsResourcePage title={copy.title} subtitle={copy.subtitle} />;
}
