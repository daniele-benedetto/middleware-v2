import { resolveQuickActions } from "@/features/cms/shared/actions";
import { i18n } from "@/lib/i18n";

describe("resolveQuickActions", () => {
  it("filters invisible actions and computes disabled state", () => {
    const actions = resolveQuickActions(
      [
        {
          id: "edit",
          label: "Edit",
          scope: "single",
          isVisible: ({ selectedCount }) => selectedCount === 1,
          isEnabled: ({ isPending }) => !isPending,
        },
        {
          id: "delete",
          label: "Delete",
          scope: "bulk",
          tone: "danger",
          isVisible: () => false,
        },
      ],
      { selectedCount: 1, isPending: true },
    );

    expect(actions).toEqual([
      {
        id: "edit",
        label: "Edit",
        tone: "default",
        disabled: true,
        confirm: undefined,
      },
    ]);
  });

  it("uses default confirm copy when confirmation is required without explicit copy", () => {
    const actions = resolveQuickActions(
      [
        {
          id: "archive",
          label: "Archive",
          scope: "bulk",
          requiresConfirm: true,
        },
      ],
      { selectedCount: 2, isPending: false },
    );

    expect(actions[0]?.confirm).toEqual({
      title: i18n.cms.common.defaultConfirmTitle,
      description: i18n.cms.common.defaultBulkActionDescription,
    });
  });

  it("resolves confirm copy from a function", () => {
    const actions = resolveQuickActions(
      [
        {
          id: "delete",
          label: "Delete",
          scope: "bulk",
          tone: "danger",
          requiresConfirm: ({ selectedCount }) => selectedCount > 0,
          confirm: ({ selectedCount }) => ({
            title: `Delete ${selectedCount}`,
            description: "Danger zone",
          }),
        },
      ],
      { selectedCount: 3, isPending: false },
    );

    expect(actions[0]?.confirm).toEqual({
      title: "Delete 3",
      description: "Danger zone",
    });
  });
});
