import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren, ReactElement } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export function AppProviders({ children }: PropsWithChildren): ReactElement {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
