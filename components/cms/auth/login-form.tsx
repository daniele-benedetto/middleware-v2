"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { CmsActionButton } from "@/components/cms/primitives";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { cmsFieldLabelClass, cmsInputClass } from "@/lib/cms/ui/variants";
import { i18n } from "@/lib/i18n";

export function CmsLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const text = i18n.cms.auth;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextPath = searchParams.get("next") ?? "/cms";

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
        callbackURL: nextPath,
      });

      if (result.error) {
        setError(text.invalidCredentials);
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setError(text.invalidCredentials);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <label className={cmsFieldLabelClass} htmlFor="email">
          {text.emailLabel}
        </label>
        <Input
          id="email"
          autoComplete="email"
          className={cmsInputClass}
          inputMode="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>

      <div className="space-y-2">
        <label className={cmsFieldLabelClass} htmlFor="password">
          {text.passwordLabel}
        </label>
        <Input
          id="password"
          autoComplete="current-password"
          className={cmsInputClass}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>

      {error ? <p className="text-sm text-accent">{error}</p> : null}

      <CmsActionButton className="w-full" isLoading={isSubmitting} tone="primary" type="submit">
        {isSubmitting ? text.signingInCta : text.signInCta}
      </CmsActionButton>
    </form>
  );
}
