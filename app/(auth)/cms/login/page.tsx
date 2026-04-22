import { redirect } from "next/navigation";

import { CmsLoginForm } from "@/components/cms/auth/login-form";
import { CmsBodyText, CmsEyebrow, CmsHeading } from "@/components/cms/primitives";
import { getCmsSession } from "@/lib/cms/auth";
import { i18n } from "@/lib/i18n";

export default async function CmsLoginPage() {
  const session = await getCmsSession();
  const text = i18n.cms.auth;

  if (session) {
    redirect("/cms");
  }

  return (
    <main className="mx-auto flex w-full max-w-130 flex-1 flex-col px-6 py-12">
      <CmsEyebrow tone="accent">{i18n.cms.home.brand}</CmsEyebrow>
      <CmsHeading size="page" className="mt-3">
        {text.loginTitle}
      </CmsHeading>
      <CmsBodyText size="lg" className="mt-4">
        {text.loginDescription}
      </CmsBodyText>
      <div className="mt-6">
        <CmsLoginForm />
      </div>
    </main>
  );
}
