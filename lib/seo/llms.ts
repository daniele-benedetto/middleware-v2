import { i18n } from "@/lib/i18n";
import { seoConfig } from "@/lib/seo/config";
import { getCanonicalUrl } from "@/lib/seo/metadata";

export function buildLlmsTxt(): string {
  const text = i18n.public.seo.llms;
  return `# ${seoConfig.siteName}

> ${seoConfig.defaultDescription}

${text.mainPagesHeading}

${text.homepageDescription.replace(":", `(${getCanonicalUrl("/")}):`)}
${text.articlesDescription.replace(":", `(${getCanonicalUrl("/articoli")}):`)}
${text.archiveDescription.replace(":", `(${getCanonicalUrl("/uscite")}):`)}
${text.formazioneDescription.replace(":", `(${getCanonicalUrl("/contro-formazione")}):`)}
${text.aboutDescription.replace(":", `(${getCanonicalUrl("/chi-siamo")}):`)}

${text.contentHeading}

${text.articlesDetails}
${text.issuesDetails}
${text.coursesDetails}
${text.lessonsDetails}

${text.feedHeading}

${text.rssLabel}(${getCanonicalUrl("/feed.xml")})
`;
}
