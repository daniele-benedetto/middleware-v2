export {
  executeBulk,
  type BulkExecutionFailure,
  type BulkExecutionResult,
} from "@/features/cms/shared/actions/execute-bulk";
export {
  mapBulkQuickActionError,
  mapQuickActionError,
} from "@/features/cms/shared/actions/quick-action-errors";
export { resolveQuickActions } from "@/features/cms/shared/actions/resolve-quick-actions";
export type {
  CmsQuickAction,
  CmsQuickActionConfirmCopy,
  CmsQuickActionRuleContext,
  CmsQuickActionScope,
  CmsQuickActionTone,
  CmsResolvedQuickAction,
} from "@/features/cms/shared/actions/types";
