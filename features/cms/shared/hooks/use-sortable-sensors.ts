"use client";

import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";

export function useSortableSensors() {
  return useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 8,
      },
    }),
  );
}
