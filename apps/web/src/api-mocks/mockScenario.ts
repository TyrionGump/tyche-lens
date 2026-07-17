export const MOCK_SCENARIOS = ["normal", "empty", "error", "slow"] as const;

export type MockScenario = (typeof MOCK_SCENARIOS)[number];

export function parseMockScenario(search: string): MockScenario {
  const requestedScenario = new URLSearchParams(search).get("mockScenario")?.trim();
  if (!requestedScenario) return "normal";

  const scenario = MOCK_SCENARIOS.find((candidate) => candidate === requestedScenario);
  if (scenario) return scenario;

  throw new Error(
    `Unknown mock scenario "${requestedScenario}". Expected one of: ${MOCK_SCENARIOS.join(", ")}.`,
  );
}
