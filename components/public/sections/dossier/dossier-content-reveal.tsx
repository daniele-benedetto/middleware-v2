import type { ReactNode } from "react";

type DossierContentRevealProps = {
  children: ReactNode;
};

export function DossierContentReveal({ children }: DossierContentRevealProps) {
  return <div>{children}</div>;
}
