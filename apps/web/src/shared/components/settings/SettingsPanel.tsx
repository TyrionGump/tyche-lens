import { useCallback, useEffect, useRef } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import styles from "./settings.module.css";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const VIEWPORT_PADDING = 16;

export function SettingsPanel({ open, onClose, title = "Settings", children }: SettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const panelPosition = useRef({
    right: VIEWPORT_PADDING,
    bottom: VIEWPORT_PADDING,
  });

  const clampToViewport = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const maximumRightOffset = Math.max(
      VIEWPORT_PADDING,
      window.innerWidth - panel.offsetWidth - VIEWPORT_PADDING,
    );
    const maximumBottomOffset = Math.max(
      VIEWPORT_PADDING,
      window.innerHeight - panel.offsetHeight - VIEWPORT_PADDING,
    );
    panelPosition.current = {
      right: Math.min(maximumRightOffset, Math.max(VIEWPORT_PADDING, panelPosition.current.right)),
      bottom: Math.min(
        maximumBottomOffset,
        Math.max(VIEWPORT_PADDING, panelPosition.current.bottom),
      ),
    };
    panel.style.right = `${panelPosition.current.right}px`;
    panel.style.bottom = `${panelPosition.current.bottom}px`;
  }, []);

  useEffect(() => {
    if (!open) return;
    clampToViewport();
    const observer = new ResizeObserver(clampToViewport);
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, [open, clampToViewport]);

  if (!open) return null;

  const handleDragStart = (event: ReactMouseEvent) => {
    const panel = panelRef.current;
    if (!panel) return;
    const panelRectangle = panel.getBoundingClientRect();
    const pointerStartX = event.clientX;
    const pointerStartY = event.clientY;
    const initialRightOffset = window.innerWidth - panelRectangle.right;
    const initialBottomOffset = window.innerHeight - panelRectangle.bottom;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      panelPosition.current = {
        right: initialRightOffset - (moveEvent.clientX - pointerStartX),
        bottom: initialBottomOffset - (moveEvent.clientY - pointerStartY),
      };
      clampToViewport();
    };
    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      ref={panelRef}
      className={styles.panel}
      style={{ right: panelPosition.current.right, bottom: panelPosition.current.bottom }}
    >
      <div className={styles.header} onMouseDown={handleDragStart}>
        <b>{title}</b>
        <button
          className={styles.closeButton}
          aria-label="Close settings"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
