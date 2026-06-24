import { publicTypography } from "@/components/public/primitives";
import { BlockTitle } from "@/components/public/sections/dossier/block-title";
import { cn } from "@/lib/utils";

import type { NarrativeHomeBlock } from "@/components/public/home/home-view-model";

export function BlockSectionIntro({ block }: { block: NarrativeHomeBlock }) {
  const hasTitle = Boolean(block.title);
  const hasDescription = Boolean(block.description);

  if (!hasTitle && !hasDescription) {
    return null;
  }

  return (
    <div className="pb-6 lg:pb-7">
      {hasTitle ? (
        <h2 className={cn(publicTypography.blockTitle, "text-foreground")}>
          <BlockTitle block={block} />
        </h2>
      ) : null}
      {hasTitle ? (
        <div className="mt-6 border-t border-foreground pt-5">
          {hasDescription ? (
            <p className={cn("w-full text-body-text", publicTypography.editorialBody)}>
              {block.description}
            </p>
          ) : null}
        </div>
      ) : hasDescription ? (
        <p className={cn("mt-4 w-full text-body-text", publicTypography.editorialBody)}>
          {block.description}
        </p>
      ) : null}
    </div>
  );
}
