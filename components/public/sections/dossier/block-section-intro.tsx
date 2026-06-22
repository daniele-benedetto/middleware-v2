import { BlockTitle } from "@/components/public/sections/dossier/block-title";

import type { NarrativeHomeBlock } from "@/components/public/home/home-view-model";

export function BlockSectionIntro({ block }: { block: NarrativeHomeBlock }) {
  if (!block.title && !block.description) {
    return null;
  }

  return (
    <div className="pb-6 lg:pb-7">
      {block.title ? (
        <h2 className="font-heading text-[clamp(34px,4vw,64px)] leading-[0.9] font-black tracking-[-0.045em] text-foreground uppercase">
          <BlockTitle block={block} />
        </h2>
      ) : null}
      {block.title ? (
        <div className="mt-6 border-t border-foreground pt-5">
          {block.description ? (
            <p className="w-full font-editorial text-[clamp(17px,1.4vw,21px)] leading-normal text-body-text">
              {block.description}
            </p>
          ) : null}
        </div>
      ) : block.description ? (
        <p className="mt-4 w-full font-editorial text-[clamp(17px,1.4vw,21px)] leading-normal text-body-text">
          {block.description}
        </p>
      ) : null}
    </div>
  );
}
