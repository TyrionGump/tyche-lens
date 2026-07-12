import type { ReactNode } from "react";

interface PageHeaderProps {
  title?: string;
  tabs?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, tabs, actions }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex min-h-13 items-center gap-3.5 border-b border-border bg-bg px-6.5 py-2.25">
      {title && (
        <h1 className="text-lg font-extrabold tracking-tight whitespace-nowrap">{title}</h1>
      )}
      {tabs}
      {actions && <div className="ml-auto flex items-center gap-2.5">{actions}</div>}
    </header>
  );
}
