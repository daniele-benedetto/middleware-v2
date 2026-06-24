import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CmsLoginForm } from "@/components/cms/auth/login-form";
import { CmsBrand } from "@/components/cms/primitives";
import { getCmsSession } from "@/lib/cms/auth";
import { getSafeCmsNextPath } from "@/lib/cms/redirect";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

type CmsLoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata = buildCmsMetadata({
  title: i18n.cms.auth.loginTitle,
  description: i18n.cms.auth.loginDescription,
  path: "/cms/login",
});

function CmsLoginShell() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-110 flex-col items-center gap-6">
        <CmsBrand size="lg" orientation="horizontal" priority />
        <div className="w-full">
          <Suspense fallback={null}>
            <CmsLoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function CmsLoginGate({ searchParams }: CmsLoginPageProps) {
  const session = await getCmsSession();
  const resolvedSearchParams = await searchParams;
  const requestedNext = resolvedSearchParams.next;
  const nextPath = getSafeCmsNextPath(
    Array.isArray(requestedNext) ? requestedNext[0] : requestedNext,
  );

  if (session) {
    redirect(nextPath);
  }

  return <CmsLoginShell />;
}

export default function CmsLoginPage({ searchParams }: CmsLoginPageProps) {
  return (
    <Suspense fallback={<CmsLoginShell />}>
      <CmsLoginGate searchParams={searchParams} />
    </Suspense>
  );
}
