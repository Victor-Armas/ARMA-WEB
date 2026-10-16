import { useRef, type PointerEvent, type MouseEvent } from "react";

export function useSwipeNavigation(
  enabled: boolean,
  onMove: (offset: number) => void,
) {
  const origin = useRef<{ x: number; y: number; id: number } | null>(null);
  const swiped = useRef(false);
  return {
    onPointerDownCapture: (event: PointerEvent<HTMLDivElement>) => {
      if (!enabled || !event.isPrimary || event.button !== 0) return;
      origin.current = {
        x: event.clientX,
        y: event.clientY,
        id: event.pointerId,
      };
      swiped.current = false;
    },
    onPointerMoveCapture: (event: PointerEvent<HTMLDivElement>) => {
      const start = origin.current;
      if (!start || start.id !== event.pointerId) return;
      const dx = Math.abs(event.clientX - start.x);
      const dy = Math.abs(event.clientY - start.y);
      if (
        dx > 12 &&
        dx > dy * 1.5 &&
        !event.currentTarget.hasPointerCapture(event.pointerId)
      ) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    onPointerUpCapture: (event: PointerEvent<HTMLDivElement>) => {
      const start = origin.current;
      if (!start || start.id !== event.pointerId) return;
      origin.current = null;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        swiped.current = true;
        onMove(dx < 0 ? 1 : -1);
      }
    },
    onPointerCancel: () => {
      origin.current = null;
    },
    onClickCapture: (event: MouseEvent<HTMLDivElement>) => {
      if (swiped.current) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
  };
}
