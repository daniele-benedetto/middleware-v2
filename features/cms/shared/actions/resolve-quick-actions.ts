import { i18n } from "@/lib/i18n";

import type {
  CmsQuickAction,
  CmsQuickActionConfirmCopy,
  CmsQuickActionRuleContext,
  CmsResolvedQuickAction,
} from "@/features/cms/shared/actions/types";

function evaluateRule<TContext>(
  rule: boolean | ((context: TContext) => boolean) | undefined,
  context: TContext,
  fallback: boolean,
) {
  if (typeof rule === "undefined") {
    return fallback;
  }

  if (typeof rule === "boolean") {
    return rule;
  }

  return rule(context);
}

function resolveConfirmCopy<TContext>(
  action: CmsQuickAction<TContext>,
  context: TContext,
): CmsQuickActionConfirmCopy | undefined {
  const text = i18n.cms.common;
  const shouldConfirm = evaluateRule(action.requiresConfirm, context, false);

  if (!shouldConfirm) {
    return undefined;
  }

  if (!action.confirm) {
    return {
      title: text.defaultConfirmTitle,
      description: text.defaultBulkActionDescription,
    };
  }

  return typeof action.confirm === "function" ? action.confirm(context) : action.confirm;
}

export function resolveQuickActions<TContext = CmsQuickActionRuleContext>(
  actions: CmsQuickAction<TContext>[],
  context: TContext,
): CmsResolvedQuickAction[] {
  return actions
    .filter((action) => evaluateRule(action.isVisible, context, true))
    .map((action) => {
      const isEnabled = evaluateRule(action.isEnabled, context, true);

      return {
        id: action.id,
        label: action.label,
        tone: action.tone ?? "default",
        disabled: !isEnabled,
        confirm: resolveConfirmCopy(action, context),
      } satisfies CmsResolvedQuickAction;
    });
}
