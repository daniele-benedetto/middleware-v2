"use cache";

import { PublicFormazioneIndexPage } from "@/components/public/pages";
import { i18n } from "@/lib/i18n";
import { getPublicFormazioneIndexData } from "@/lib/public/server/course-page";
import { buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

const controFormazionePath = "/contro-formazione";

export async function generateMetadata(): Promise<Metadata> {
  const text = i18n.public.formazione.metadata;

  return buildPageMetadata({
    title: text.title,
    description: text.description,
    path: controFormazionePath,
    socialImageSection: "contro-formazione",
    socialImageTheme: "black",
  });
}

export default async function PublicControFormazioneRoute() {
  const { courses } = await getPublicFormazioneIndexData();

  return <PublicFormazioneIndexPage courses={courses} />;
}
