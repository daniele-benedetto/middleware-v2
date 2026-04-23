export type CmsQuickActionScope = "single" | "bulk" | "both";

export type CmsQuickActionTone = "default" | "danger";

export type CmsQuickActionRuleContext = {
  selectedCount: number;
  isPending: boolean;
};

export type CmsQuickActionConfirmCopy = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type CmsQuickActionRule<TContext> = (context: TContext) => boolean;

type CmsQuickActionConfirmResolver<TContext> =
  | CmsQuickActionConfirmCopy
  | ((context: TContext) => CmsQuickActionConfirmCopy);

export type CmsQuickAction<TContext = CmsQuickActionRuleContext> = {
  id: string;
  label: string;
  scope: CmsQuickActionScope;
  tone?: CmsQuickActionTone;
  requiresConfirm?: boolean | CmsQuickActionRule<TContext>;
  confirm?: CmsQuickActionConfirmResolver<TContext>;
  isVisible?: CmsQuickActionRule<TContext>;
  isEnabled?: CmsQuickActionRule<TContext>;
};

export type CmsResolvedQuickAction = {
  id: string;
  label: string;
  tone: CmsQuickActionTone;
  disabled: boolean;
  confirm?: CmsQuickActionConfirmCopy;
};
