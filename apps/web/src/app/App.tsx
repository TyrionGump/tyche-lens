import { RouterProvider } from "react-router-dom";
import { AppProviders } from "./providers/AppProviders.tsx";
import { router } from "./router.tsx";

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
