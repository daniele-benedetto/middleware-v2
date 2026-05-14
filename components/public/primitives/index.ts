/**
 * Public editorial primitives.
 *
 * The typography/surface/divider primitives live in `components/cms/primitives`
 * because they encode Style Guide tokens that are brand-shared between CMS
 * and public reader. The public barrel re-exports them under `Public*`
 * aliases so editorial composers can stay decoupled from the CMS namespace.
 *
 * If a real divergence is needed (different defaults, props), replace the
 * relevant alias with a dedicated implementation in this folder.
 */

export {
  CmsBlockquote as PublicBlockquote,
  CmsBody as PublicBody,
  CmsBodyText as PublicBodyText,
  CmsDisplay as PublicDisplay,
  CmsEpigraph as PublicEpigraph,
  CmsEyebrow as PublicEyebrow,
  CmsHairline as PublicHairline,
  CmsHeading as PublicHeading,
  CmsMetaText as PublicMetaText,
  CmsNote as PublicNote,
  CmsParagraphNumber as PublicParagraphNumber,
  CmsSectionNumber as PublicSectionNumber,
} from "@/components/cms/primitives/typography";

export { CmsSectionDivider as PublicDivider } from "@/components/cms/primitives/section-divider";
export { CmsSurface as PublicSurface } from "@/components/cms/primitives/surface";
