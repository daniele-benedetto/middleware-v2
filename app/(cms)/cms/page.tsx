import { redirect } from "next/navigation";

import { requireCmsSession } from "@/lib/cms/auth";

export default async function CmsIndexPage() {
  await requireCmsSession("/cms/issues");

  redirect("/cms/issues");
}
