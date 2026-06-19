import "dotenv/config";

import { prisma } from "../lib/prisma";

const seededPages = [
  {
    title: "Chi siamo",
    slug: "chi-siamo",
    text: "Pagina introduttiva del laboratorio di inchiesta Middleware.",
  },
  {
    title: "Privacy policy",
    slug: "privacy-policy",
    text: "Inserire qui la privacy policy ufficiale di Middleware.",
  },
  {
    title: "Cookie policy",
    slug: "cookie-policy",
    text: "Inserire qui la cookie policy ufficiale di Middleware.",
  },
] as const;

function richTextDoc(text: string) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

async function main() {
  await Promise.all(
    seededPages.map((page) =>
      prisma.page.upsert({
        where: { slug: page.slug },
        update: {
          title: page.title,
          contentRich: richTextDoc(page.text),
        },
        create: {
          title: page.title,
          slug: page.slug,
          status: "DRAFT",
          publishedAt: null,
          contentRich: richTextDoc(page.text),
        },
      }),
    ),
  );

  const totalPages = await prisma.page.count();
  console.log("Seed pages ready:", { slugs: seededPages.map((page) => page.slug), totalPages });
}

main()
  .catch((error) => {
    console.error("Failed to seed pages", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
