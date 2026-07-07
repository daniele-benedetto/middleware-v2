import { connection } from "next/server";

import { PublicFormazioneIndexPage } from "@/components/public/pages";
import { i18n } from "@/lib/i18n";
import { getPublicFormazioneIndexData } from "@/lib/public/server/course-page";
import { buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

const formazionePath = "/formazione";

export async function generateMetadata(): Promise<Metadata> {
  const text = i18n.public.formazione.metadata;

  return buildPageMetadata({
    title: text.title,
    description: text.description,
    path: formazionePath,
  });
}

export default async function PublicFormazioneRoute() {
  await connection();
  const { courses } = await getPublicFormazioneIndexData();

  return <PublicFormazioneIndexPage courses={courses} />;
}
