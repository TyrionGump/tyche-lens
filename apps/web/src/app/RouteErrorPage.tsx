import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";

function getRouteErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`.trim();
  }
  if (error instanceof Error) return error.message;
  return "An unexpected navigation error occurred.";
}

interface RouteErrorPageProps {
  standalone?: boolean;
}

export function RouteErrorPage({ standalone = false }: RouteErrorPageProps) {
  const error = useRouteError();

  const content = (
    <div className="flex min-h-full items-center justify-center bg-bg p-6 text-ink">
      <section className="w-full max-w-lg rounded-panel border border-border bg-card p-8 text-center shadow-[var(--shadow)]">
        <p className="mb-2 text-label font-bold tracking-wide text-faint uppercase">Route error</p>
        <h1 className="mb-3 text-heading font-extrabold">This page could not be displayed</h1>
        <p className="mb-6 text-body text-dim">{getRouteErrorMessage(error)}</p>
        <Link
          to="/dashboard"
          className="inline-flex rounded-control bg-accent px-4 py-2.5 text-body font-bold text-white no-underline"
        >
          Return to dashboard
        </Link>
      </section>
    </div>
  );

  if (!standalone) return content;

  return (
    <div className="tl-app" data-theme="light">
      <main className="h-full min-h-0" style={{ gridArea: "1 / 1 / -1 / -1" }}>
        {content}
      </main>
    </div>
  );
}
