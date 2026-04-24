import { redirect } from "next/navigation";

import { CmsLoginForm } from "@/components/cms/auth/login-form";
import { CmsBrand } from "@/components/cms/primitives";
import { getCmsSession } from "@/lib/cms/auth";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.auth.loginTitle,
  description: i18n.cms.auth.loginDescription,
  path: "/cms/login",
});

export default async function CmsLoginPage() {
  const session = await getCmsSession();

  if (session) {
    redirect("/cms");
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-110 flex-col items-center gap-6">
        <CmsBrand size="lg" orientation="horizontal" priority />
        <div className="w-full">
          <CmsLoginForm />
        </div>
      </div>
    </main>
  );
}
