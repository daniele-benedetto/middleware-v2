import { PublicHomePage } from "@/components/public/home";
import { getCurrentIssueDetail } from "@/lib/public/server/current-issue-detail";
import { getPublishedIssues } from "@/lib/public/server/issues";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [currentIssue, publishedIssues] = await Promise.all([
    getCurrentIssueDetail(),
    getPublishedIssues(),
  ]);

  return <PublicHomePage currentIssue={currentIssue} publishedIssues={publishedIssues} />;
}
