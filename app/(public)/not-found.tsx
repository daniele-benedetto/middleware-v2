import { PublicSystemActionLink, PublicSystemScreen } from "@/components/public";
import { i18n } from "@/lib/i18n";

export default function PublicNotFound() {
  const text = i18n.public.system;

  return (
    <PublicSystemScreen
      code={text.notFoundCode}
      kicker={text.notFoundKicker}
      title={text.notFoundTitle}
      description={text.notFoundDescription}
      actions={
        <PublicSystemActionLink href="/" tone="accent">
          {text.goHome}
        </PublicSystemActionLink>
      }
    />
  );
}
