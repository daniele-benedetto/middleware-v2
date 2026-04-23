"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  CmsActionButton,
  CmsDisplay,
  CmsFormField,
  CmsMetaText,
  CmsTextInput,
} from "@/components/cms/primitives";
import { authClient } from "@/lib/auth-client";
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
    <form className="border border-foreground bg-white" onSubmit={onSubmit}>
      <div className="flex items-center justify-between bg-foreground px-4.5 py-3.5">
        <CmsDisplay size="label" tone="onAccent">
          LOGIN CMS
        </CmsDisplay>
        <CmsMetaText variant="tiny" className="text-white/50!">
          ACCESSO RISERVATO
        </CmsMetaText>
      </div>

      <div className="flex flex-col gap-4 border-b border-border px-4.5 py-5">
        <CmsFormField label={text.emailLabel} htmlFor="email">
          <CmsTextInput
            id="email"
            autoComplete="email"
            state={error ? "error" : email ? "filled" : "default"}
            tone="mono"
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
            placeholder="nome@dominio.it"
          />
        </CmsFormField>

        <CmsFormField label={text.passwordLabel} htmlFor="password">
          <CmsTextInput
            id="password"
            autoComplete="current-password"
            state={error ? "error" : password ? "filled" : "default"}
            tone="mono"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
            placeholder="••••••••"
          />
        </CmsFormField>

        {error ? (
          <CmsMetaText variant="tiny" as="p" className="text-accent!">
            {"⚑ "}
            {error}
          </CmsMetaText>
        ) : null}
      </div>

      <CmsActionButton
        className="h-12.5 w-full justify-start border-0 bg-accent px-4.5 text-[12px] text-primary-foreground hover:bg-accent/90"
        isLoading={isSubmitting}
        tone="danger"
        type="submit"
      >
        {isSubmitting ? `→ ${text.signingInCta}` : `→ ${text.signInCta}`}
      </CmsActionButton>
    </form>
  );
}
