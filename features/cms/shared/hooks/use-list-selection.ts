"use client";

import { useMemo, useState } from "react";

export function useListSelection() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  return {
    selectedIds,
    selectedCount: selectedIds.length,
    hasSelection: selectedIds.length > 0,
    isSelected: (id: string) => selectedSet.has(id),
    clearSelection: () => setSelectedIds([]),
    setSelection: (ids: string[]) => setSelectedIds(ids),
    toggleSelection: (id: string) => {
      setSelectedIds((current) => {
        if (current.includes(id)) {
          return current.filter((item) => item !== id);
        }

        return [...current, id];
      });
    },
    toggleSelectAll: (ids: string[]) => {
      setSelectedIds((current) => {
        const allSelected = ids.length > 0 && ids.every((id) => current.includes(id));
        return allSelected ? [] : ids;
      });
    },
  };
}
