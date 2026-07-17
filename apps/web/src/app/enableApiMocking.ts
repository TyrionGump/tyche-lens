export async function enableApiMocking(): Promise<void> {
  if (!import.meta.env.DEV || import.meta.env.MODE !== "mock") return;

  const { startApiMocking } = await import("../api-mocks/startApiMocking.ts");
  await startApiMocking();
}
