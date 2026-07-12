import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { mergeClassNames } from "@/shared/utilities/mergeClassNames.ts";

interface SidebarNavigationProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

function NavigationIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const NAVIGATION_ITEMS: Array<{ label: string; to: string | null; icon: ReactNode }> = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: (
      <NavigationIcon>
        <rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1.3" />
        <rect x="10" y="2.5" width="5.5" height="5.5" rx="1.3" />
        <rect x="2.5" y="10" width="5.5" height="5.5" rx="1.3" />
        <rect x="10" y="10" width="5.5" height="5.5" rx="1.3" />
      </NavigationIcon>
    ),
  },
  {
    label: "Watchlist",
    to: "/watchlist",
    icon: (
      <NavigationIcon>
        <path d="M7 4.5h8M7 9h8M7 13.5h8" />
        <circle cx="3.5" cy="4.5" r="1" />
        <circle cx="3.5" cy="9" r="1" />
        <circle cx="3.5" cy="13.5" r="1" />
      </NavigationIcon>
    ),
  },
  {
    label: "Company",
    to: null,
    icon: (
      <NavigationIcon>
        <path d="M3.5 15.5V5l5-2.5 5 2.5v10.5" />
        <path d="M2.5 15.5h13" />
        <path d="M7 15.5v-3h3v3" />
      </NavigationIcon>
    ),
  },
  {
    label: "Portfolio",
    to: null,
    icon: (
      <NavigationIcon>
        <rect x="2.5" y="5.5" width="13" height="9" rx="1.5" />
        <path d="M6.5 5.5V4.2a1.2 1.2 0 0 1 1.2-1.2h2.6a1.2 1.2 0 0 1 1.2 1.2v1.3" />
        <path d="M2.5 9.5h13" />
      </NavigationIcon>
    ),
  },
  {
    label: "Markets",
    to: null,
    icon: (
      <NavigationIcon>
        <path d="M2.5 15.5h13" />
        <path d="M3.5 12l3.5-3.5 3 3 4.5-5" />
        <path d="M12 6.5h2.5V9" />
      </NavigationIcon>
    ),
  },
];

const collapseIcon = (
  <NavigationIcon>
    <path d="M11 4.5L6.5 9l4.5 4.5" />
  </NavigationIcon>
);
const expandIcon = (
  <NavigationIcon>
    <path d="M7 4.5L11.5 9 7 13.5" />
  </NavigationIcon>
);

const NAVIGATION_ITEM_CLASS =
  "flex items-center gap-2.75 rounded-control px-2.75 py-2.25 font-semibold whitespace-nowrap transition-colors duration-120";
const ICON_CONTAINER_CLASS = "flex h-5 w-4.5 flex-none items-center justify-center";

export function SidebarNavigation({ collapsed, onToggleCollapsed }: SidebarNavigationProps) {
  const labelClassName = mergeClassNames(
    "min-w-0 overflow-hidden text-ellipsis",
    collapsed && "hidden",
  );

  return (
    <nav
      className="[grid-area:sidebar] flex w-[var(--sidebar-w)] flex-col overflow-hidden border-r border-border bg-card p-3 transition-[width] duration-160"
      aria-label="Primary navigation"
    >
      <div className="flex flex-1 flex-col gap-0.5">
        {NAVIGATION_ITEMS.map(({ label, to, icon }) =>
          to ? (
            <NavLink
              key={label}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                mergeClassNames(
                  NAVIGATION_ITEM_CLASS,
                  "text-sm no-underline",
                  isActive
                    ? "bg-accent-soft text-accent"
                    : "text-dim hover:bg-hover hover:text-ink",
                )
              }
            >
              <span className={ICON_CONTAINER_CLASS}>{icon}</span>
              <span className={labelClassName}>{label}</span>
            </NavLink>
          ) : (
            <span
              key={label}
              className={mergeClassNames(
                NAVIGATION_ITEM_CLASS,
                "cursor-default text-sm text-dim opacity-50",
              )}
              title={collapsed ? `${label} — coming soon` : "Coming soon"}
            >
              <span className={ICON_CONTAINER_CLASS}>{icon}</span>
              <span className={labelClassName}>{label}</span>
              <span
                className={mergeClassNames(
                  "ml-auto text-micro font-bold tracking-wide uppercase text-faint",
                  collapsed && "hidden",
                )}
              >
                soon
              </span>
            </span>
          ),
        )}
      </div>
      <button
        type="button"
        className={mergeClassNames(
          NAVIGATION_ITEM_CLASS,
          "mt-1.5 cursor-pointer border-none bg-transparent text-body text-dim hover:bg-hover hover:text-ink",
        )}
        onClick={onToggleCollapsed}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <span className={ICON_CONTAINER_CLASS}>{collapsed ? expandIcon : collapseIcon}</span>
        <span className={labelClassName}>Collapse</span>
      </button>
    </nav>
  );
}
