import {
  assessDiagnosticCredibility,
  type CredibilityItemInput,
  type DiagnosticCredibility,
} from "./diagnostic-credibility";

export function runCredibility(
  items: CredibilityItemInput[],
  scoringMode?: string,
): DiagnosticCredibility {
  return assessDiagnosticCredibility({
    items,
    ...(scoringMode ? { scoringMode } : {}),
  });
}

/** Default credibility for test fixtures that do not model engine items. */
export const DEMO_RUN_CREDIBILITY: DiagnosticCredibility = runCredibility([
  {
    engineTest: { engineId: "proxy-engine-stub", answer: "[stub] fixture", sources: [] },
    score: { sourcesCount: 1 },
  },
]);
