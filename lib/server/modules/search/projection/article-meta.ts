import { i18n } from "@/lib/i18n";

type ArticleSearchMetaInput = {
  categoryName: string;
  authorName: string | null;
  publishedAt: Date | null;
  hasAudio: boolean;
};

const publishedDateFormatter = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "long",
  timeZone: "Europe/Rome",
});

export function articleSearchMeta({
  categoryName,
  authorName,
  publishedAt,
  hasAudio,
}: ArticleSearchMetaInput): string[] {
  return [
    categoryName,
    authorName,
    publishedAt ? publishedDateFormatter.format(publishedAt) : null,
    hasAudio ? i18n.public.home.articleCard.audioLabel : null,
  ].filter((label): label is string => Boolean(label));
}
