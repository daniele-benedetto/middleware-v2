import { publicTypography } from "@/components/public/primitives";
import { BlockTitle } from "@/components/public/sections/dossier/block-title";
import { cn } from "@/lib/utils";

import type { NarrativeHomeBlock } from "@/components/public/home/home-view-model";

export function BlockSectionIntro({ block }: { block: NarrativeHomeBlock }) {
  if (!block.title && !block.description) {
    return null;
  }

  return (
    <div className="pb-6 lg:pb-7">
      {block.title ? (
        <h2 className={cn(publicTypography.blockTitle, "text-foreground")}>
          <BlockTitle block={block} />
        </h2>
      ) : null}
      {block.title ? (
        <div className="mt-6 border-t border-foreground pt-5">
          {block.description ? (
            <p className={cn("w-full text-body-text", publicTypography.editorialBody)}>
              {block.description}
            </p>
          ) : null}
        </div>
      ) : block.description ? (
        <p className={cn("mt-4 w-full text-body-text", publicTypography.editorialBody)}>
          {block.description}
        </p>
      ) : null}
    </div>
  );
}
