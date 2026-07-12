import { useState } from "react";
import type { CSSProperties } from "react";
import { Outlet } from "react-router-dom";
import { AppearanceSettingsPanel } from "./AppearanceSettingsPanel.tsx";
import type { AppearanceSettings } from "./AppearanceSettingsPanel.tsx";
import { ApplicationHeader } from "./ApplicationHeader.tsx";
import { useAppearanceSettings } from "./hooks/useAppearanceSettings.ts";
import { useSidebarPreference } from "./hooks/useSidebarPreference.ts";
import { useThemePreference } from "./hooks/useThemePreference.ts";
import { SidebarNavigation } from "./SidebarNavigation.tsx";

const THEME_STORAGE_KEY = "tyche.theme.v1";
const APPEARANCE_STORAGE_KEY = "tyche.settings.v1";
const SIDEBAR_STORAGE_KEY = "tyche.sidebar.v1";
const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = { accent: "#6b4dfb", radius: 16 };

export function AppShell() {
  const { theme, toggleTheme } = useThemePreference(THEME_STORAGE_KEY);
  const { collapsed, toggleCollapsed } = useSidebarPreference(SIDEBAR_STORAGE_KEY);
  const [appearanceSettings, setAppearanceSetting] = useAppearanceSettings(
    DEFAULT_APPEARANCE_SETTINGS,
    APPEARANCE_STORAGE_KEY,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  const appStyle = {
    "--radius": `${appearanceSettings.radius}px`,
    "--accent": appearanceSettings.accent,
    "--sidebar-w": collapsed ? "64px" : "220px",
  } as CSSProperties;

  return (
    <div className="tl-app" data-theme={theme} style={appStyle}>
      <ApplicationHeader
        theme={theme}
        onToggleTheme={toggleTheme}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((currentValue) => !currentValue)}
      />
      <SidebarNavigation collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      <main className="[grid-area:main] min-h-0 overflow-y-auto">
        <Outlet />
      </main>
      <AppearanceSettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={appearanceSettings}
        setSetting={setAppearanceSetting}
      />
    </div>
  );
}
