import { useLocation } from "react-router-dom";
import type { ThemePreference } from "./hooks/useThemePreference.ts";

interface ApplicationHeaderProps {
  theme: ThemePreference;
  onToggleTheme: () => void;
  settingsOpen: boolean;
  onToggleSettings: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/watchlist": "Watchlist",
};

const settingsIcon = (
  <svg
    width="17"
    height="17"
    viewBox="0 0 18 18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
  >
    <path d="M3 5.5h6.5M12.5 5.5H15M3 12.5h2.5M8.5 12.5H15" />
    <circle cx="11" cy="5.5" r="1.9" />
    <circle cx="7" cy="12.5" r="1.9" />
  </svg>
);

export function ApplicationHeader({
  theme,
  onToggleTheme,
  settingsOpen,
  onToggleSettings,
}: ApplicationHeaderProps) {
  const { pathname } = useLocation();
  const pageTitle = PAGE_TITLES[pathname];

  return (
    <header className="[grid-area:topbar] flex h-13 items-center gap-3.5 border-b border-border bg-glass px-4 backdrop-blur-[10px]">
      <div className="flex flex-none items-center gap-2.75">
        <div className="flex size-7.5 items-center justify-center rounded-control bg-accent text-base font-extrabold text-white">
          T
        </div>
        <span className="text-lg font-extrabold tracking-tight whitespace-nowrap">Tyche Lens</span>
      </div>
      {pageTitle && (
        <>
          <span className="h-5 w-px flex-none bg-border" aria-hidden="true" />
          <span className="flex-none text-title font-bold whitespace-nowrap text-dim">
            {pageTitle}
          </span>
        </>
      )}
      <div className="flex-1" />
      <div
        className="flex min-w-0 grow-0 basis-55 items-center gap-2.25 rounded-panel border border-border bg-bg px-3.5 py-2 text-body text-faint max-[720px]:hidden"
        title="Company search arrives with the Company screen"
      >
        <span>⌕</span>
        <span className="truncate">Search stocks…</span>
      </div>
      <button className="tl-iconbtn" title="Toggle theme" onClick={onToggleTheme}>
        {theme === "light" ? "☾" : "☀"}
      </button>
      <button
        className="tl-iconbtn"
        title="Settings"
        aria-pressed={settingsOpen}
        style={settingsOpen ? { color: "var(--accent)", borderColor: "var(--accent)" } : undefined}
        onClick={onToggleSettings}
      >
        {settingsIcon}
      </button>
    </header>
  );
}
