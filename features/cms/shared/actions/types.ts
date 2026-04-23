export type CmsQuickActionScope = "single" | "bulk" | "both";

export type CmsQuickActionTone = "default" | "danger";

export type CmsQuickAction = {
  id: string;
  label: string;
  scope: CmsQuickActionScope;
  tone?: CmsQuickActionTone;
  requiresConfirm?: boolean;
  confirmTitle?: string;
  confirmDescription?: string;
};
