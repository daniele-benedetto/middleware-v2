import "server-only";

import { publicArticlesService } from "@/lib/server/modules/articles/service/public";
import { publicIssuesService } from "@/lib/server/modules/issues/service/public";

export async function getPublicPrintIssueBySlug(slug: string) {
  const issue = await publicIssuesService.getBySlug(slug);
  const articles = await Promise.all(
    issue.articles.map((article) => publicArticlesService.getBySlug(article.slug)),
  );

  return { issue, articles };
}
