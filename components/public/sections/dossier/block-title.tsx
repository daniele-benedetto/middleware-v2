import { StyledTitle } from "@/components/public/styled-title";

import type { NarrativeHomeBlock } from "@/components/public/home/home-view-model";

type BlockTitleProps = {
  block: NarrativeHomeBlock;
  primaryClassName?: string;
};

export function BlockTitle({ block, primaryClassName }: BlockTitleProps) {
  if (!block.title) {
    return null;
  }

  return (
    <StyledTitle
      title={block.title}
      titleStyled={block.titleStyled}
      primaryClassName={primaryClassName}
    />
  );
}
