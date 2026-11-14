"use client";

import { Reorder, useDragControls } from "framer-motion";
import type { CSSProperties, PointerEvent, ReactNode } from "react";

/**
 * One session card in a `Reorder.Group`. Dragging starts only from the handle the
 * card renders (via `startDrag`), so inputs and buttons inside keep working and the
 * page still scrolls when a finger lands anywhere else on the card.
 */
export function ReorderableCard({ id, className, style, children }: {
  id: string;
  className?: string;
  style?: CSSProperties;
  children: (startDrag: (event: PointerEvent) => void) => ReactNode;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      as="div"
      value={id}
      dragListener={false}
      dragControls={controls}
      className={className}
      style={{ position: "relative", ...style }}
      whileDrag={{ scale: 1.02, zIndex: 5, boxShadow: "0 18px 40px rgba(0, 0, 0, 0.28)" }}
      data-exercise-card={id}
    >
      {children((event) => controls.start(event))}
    </Reorder.Item>
  );
}
