import { i18n } from "@/lib/i18n";

type AuditLogText = typeof i18n.cms.lists.auditLogs;

export function formatAuditActionLabel(value: string, text: AuditLogText): string {
  const normalized = value.toLowerCase();

  if (normalized === "create") return text.actionCreate;
  if (normalized === "update") return text.actionUpdate;
  if (normalized === "update-reorder") return text.actionUpdateReorder;
  if (normalized === "delete") return text.actionDelete;
  if (normalized === "publish") return text.actionPublish;
  if (normalized === "unpublish") return text.actionUnpublish;
  if (normalized === "archive") return text.actionArchive;
  if (normalized === "feature") return text.actionFeature;
  if (normalized === "unfeature") return text.actionUnfeature;
  if (normalized === "reorder") return text.actionReorder;
  if (normalized === "sync-tags") return text.actionSyncTags;
  if (normalized === "update-role") return text.actionUpdateRole;
  if (normalized === "upload") return text.actionUpload;
  if (normalized === "rename") return text.actionRename;

  return value.replace(/-/g, " ");
}

export function formatAuditResourceLabel(value: string, text: AuditLogText): string {
  if (value === "articles") return text.resourceArticleLabel;
  if (value === "authors") return text.resourceAuthorLabel;
  if (value === "categories") return text.resourceCategoryLabel;
  if (value === "issues") return text.resourceIssueLabel;
  if (value === "media") return text.resourceMediaLabel;
  if (value === "navigation") return text.resourceNavigationLabel;
  if (value === "pages") return text.resourcePageLabel;
  if (value === "tags") return text.resourceTagLabel;
  if (value === "users") return text.resourceUserLabel;

  return text.resourceUnknownLabel;
}
