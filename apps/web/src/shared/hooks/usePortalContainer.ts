import { useEffect, useState } from "react";

/** The themed app root (`.tl-app`). Overlays (menus, dialogs, popovers) portal here rather than to
 *  `document.body`, so their Tailwind color tokens — which resolve against the theme variables
 *  defined on `.tl-app` — still work. */
export function usePortalContainer(): HTMLElement | null {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setContainer(document.querySelector<HTMLElement>(".tl-app"));
  }, []);
  return container;
}
