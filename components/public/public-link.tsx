import Link from "next/link";

import type { ComponentProps } from "react";

type PublicLinkProps = ComponentProps<typeof Link>;

export function PublicLink(props: PublicLinkProps) {
  return <Link {...props} />;
}
