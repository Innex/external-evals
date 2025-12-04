import type { ScorerArgs } from "autoevals";
import { Factuality } from "autoevals";
import { Eval, initDataset } from "braintrust";

// All saved conversations go into a single Braintrust dataset
const DATASET_NAME = "saved_conversations";

export type ConversationHistory = { role: string; content: string }[];

interface RunEvalParams {
  datasetId: string; // Our Postgres dataset ID (used for filtering via _internal_btql)
  tenantId: string;
  task: (input: ConversationHistory) => Promise<string>;
  experimentName?: string;
  metadata?: Record<string, unknown>;
  onProgress?: (progress: ProgressUpdate) => void;
}

export interface ProgressUpdate {
  current: number;
  total: number;
  pctComplete: number;
}

export interface EvalSummary {
  experimentId?: string;
  experimentUrl?: string;
  projectName?: string;
  experimentName?: string;
  scores?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
}

async function factualityScorer(
  args: ScorerArgs<string, { input: ConversationHistory }>,
) {
  const { input } = args;
  return await Factuality({
    ...args,
    input: input.map((item) => item.content).join("\n"),
  });
}

export async function runEvaluation(params: RunEvalParams): Promise<EvalSummary> {
  const { datasetId, task, experimentName, metadata } = params;

  const apiKey = process.env.BRAINTRUST_API_KEY;
  if (!apiKey) {
    throw new Error("BRAINTRUST_API_KEY is required for evaluations");
  }

  const projectName = process.env.BRAINTRUST_PROJECT_NAME || "customer-support-platform";

  // Initialize the dataset with _internal_btql filter for our Postgres dataset_id
  // This filters records at the Braintrust level
  const dataset = initDataset({
    project: projectName,
    dataset: DATASET_NAME,
    apiKey,
    _internal_btql: { filter: { btql: `metadata.dataset_id = '${datasetId}'` } },
  });

  // Run the evaluation
  // First argument is project name, experimentName goes in options
  const result = await Eval(projectName, {
    data: dataset,
    task,
    scores: [factualityScorer],
    experimentName,
    metadata,
    maxConcurrency: 10,
  });

  // Use the summary from the result directly
  return {
    experimentId: result.summary?.experimentId,
    experimentUrl: result.summary?.experimentUrl,
    projectName: result.summary?.projectName,
    experimentName: result.summary?.experimentName,
    scores: result.summary?.scores,
    metrics: result.summary?.metrics,
  };
}
