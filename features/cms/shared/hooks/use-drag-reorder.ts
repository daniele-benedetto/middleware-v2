"use client";

import { useMemo, useState } from "react";

type ReorderItem = { id: string };

export function useDragReorder<TItem extends ReorderItem>(items: TItem[]) {
  const itemIdsKey = items.map((item) => item.id).join("|");
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const serverOrder = useMemo(() => (itemIdsKey ? itemIdsKey.split("|") : []), [itemIdsKey]);
  const [state, setState] = useState(() => ({ sourceKey: itemIdsKey, orderedIds: serverOrder }));
  const orderedIds = state.sourceKey === itemIdsKey ? state.orderedIds : serverOrder;

  const displayedItems = useMemo(
    () => orderedIds.map((id) => itemsById.get(id)).filter((item): item is TItem => Boolean(item)),
    [itemsById, orderedIds],
  );

  return {
    displayedItems,
    orderedIds,
    reset: () => setState({ sourceKey: itemIdsKey, orderedIds: serverOrder }),
    sync: (nextOrder: string[]) => setState({ sourceKey: itemIdsKey, orderedIds: nextOrder }),
  };
}
