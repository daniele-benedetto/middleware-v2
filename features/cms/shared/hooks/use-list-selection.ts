"use client";

import { useCallback, useMemo, useState } from "react";

export function useListSelection() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const clearSelection = useCallback(() => setSelectedIds([]), []);
  const setSelection = useCallback((ids: string[]) => setSelectedIds(ids), []);
  const isSelected = useCallback((id: string) => selectedSet.has(id), [selectedSet]);
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      return [...current, id];
    });
  }, []);
  const toggleSelectAll = useCallback((ids: string[]) => {
    setSelectedIds((current) => {
      const allSelected = ids.length > 0 && ids.every((id) => current.includes(id));
      return allSelected ? [] : ids;
    });
  }, []);

  return useMemo(
    () => ({
      selectedIds,
      selectedCount: selectedIds.length,
      hasSelection: selectedIds.length > 0,
      isSelected,
      clearSelection,
      setSelection,
      toggleSelection,
      toggleSelectAll,
    }),
    [clearSelection, isSelected, selectedIds, setSelection, toggleSelectAll, toggleSelection],
  );
}
