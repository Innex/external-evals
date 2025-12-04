import { runBtqlObject } from "./braintrust-btql";

export interface ExperimentRow {
  id: string;
  input: unknown;
  output: unknown;
  expected: unknown;
  scores: Record<string, number> | null;
  metadata: Record<string, unknown> | null;
  duration: number | null;
}

export interface ExperimentSummary {
  rows: ExperimentRow[];
  totalRows: number;
  avgScores: Record<string, number>;
  passRate: number;
}

export async function fetchExperimentResults(
  experimentId: string,
): Promise<ExperimentSummary> {
  // Query experiment summary - one row per test case with aggregated scores
  // Using structured object format for the query
  const query = {
    select: [{ op: "star" }],
    from: {
      op: "function",
      name: { op: "ident", name: ["experiment"] },
      args: [{ op: "literal", value: experimentId }],
      shape: "summary",
    },
    limit: 100,
  };

  console.log("[braintrust-experiment] Running BTQL query:", JSON.stringify(query));

  const rows = await runBtqlObject<ExperimentRow>(query);

  console.log("[braintrust-experiment] Got rows:", rows.length);

  // Calculate average scores
  const avgScores: Record<string, number> = {};
  const scoreCounts: Record<string, number> = {};

  for (const row of rows) {
    if (row.scores) {
      for (const [scoreName, scoreValue] of Object.entries(row.scores)) {
        if (typeof scoreValue === "number") {
          avgScores[scoreName] = (avgScores[scoreName] ?? 0) + scoreValue;
          scoreCounts[scoreName] = (scoreCounts[scoreName] ?? 0) + 1;
        }
      }
    }
  }

  // Calculate means
  for (const scoreName of Object.keys(avgScores)) {
    if (scoreCounts[scoreName] > 0) {
      avgScores[scoreName] /= scoreCounts[scoreName];
    }
  }

  // Calculate pass rate (rows where all scores >= 0.5)
  const passCount = rows.filter((row) => {
    if (!row.scores) return false;
    return Object.values(row.scores).every((score) => score >= 0.5);
  }).length;
  const passRate = rows.length > 0 ? passCount / rows.length : 0;

  return {
    rows,
    totalRows: rows.length,
    avgScores,
    passRate,
  };
}
