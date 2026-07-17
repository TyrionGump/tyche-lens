import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/shared/styles/index.css";
import { App } from "@/app/App.tsx";
import { enableApiMocking } from "@/app/enableApiMocking.ts";

const rootElement = document.getElementById("root")!;

enableApiMocking()
  .then(() => {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((error: unknown) => {
    console.error("Failed to start the application", error);
    rootElement.textContent =
      error instanceof Error
        ? `Failed to start the application: ${error.message}`
        : "Failed to start the application.";
  });
