"use client";

import { useMemo, useState } from "react";

type ReorderItem = { id: string };

function areSameOrder(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

export function useReorderMode<TItem extends ReorderItem>(items: TItem[]) {
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draftOrder, setDraftOrder] = useState<string[]>([]);

  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const serverOrder = useMemo(() => items.map((item) => item.id), [items]);

  const normalizedOrder = useMemo(() => {
    const hasSameLength = draftOrder.length === serverOrder.length;
    const includesKnownIds = hasSameLength && draftOrder.every((id) => itemsById.has(id));

    return hasSameLength && includesKnownIds ? draftOrder : serverOrder;
  }, [draftOrder, itemsById, serverOrder]);

  const displayedItems = useMemo(() => {
    if (!isReorderMode) {
      return items;
    }

    return normalizedOrder
      .map((id) => itemsById.get(id))
      .filter((item): item is TItem => Boolean(item));
  }, [isReorderMode, items, itemsById, normalizedOrder]);

  const hasChanges = isReorderMode && !areSameOrder(normalizedOrder, serverOrder);

  const start = () => {
    setDraftOrder(serverOrder);
    setIsReorderMode(true);
  };

  const cancel = () => {
    setDraftOrder(serverOrder);
    setIsReorderMode(false);
  };

  const commit = () => {
    setDraftOrder(normalizedOrder);
    setIsReorderMode(false);
  };

  const moveUp = (index: number) => {
    if (index <= 0) {
      return;
    }

    setDraftOrder((current) => {
      const base = current.length === serverOrder.length ? [...current] : [...serverOrder];
      const temp = base[index - 1];
      base[index - 1] = base[index] ?? "";
      base[index] = temp ?? "";
      return base;
    });
  };

  const moveDown = (index: number) => {
    if (index >= normalizedOrder.length - 1) {
      return;
    }

    setDraftOrder((current) => {
      const base = current.length === serverOrder.length ? [...current] : [...serverOrder];
      const temp = base[index + 1];
      base[index + 1] = base[index] ?? "";
      base[index] = temp ?? "";
      return base;
    });
  };

  return {
    isReorderMode,
    hasChanges,
    serverOrder,
    normalizedOrder,
    displayedItems,
    start,
    cancel,
    commit,
    moveUp,
    moveDown,
  };
}
