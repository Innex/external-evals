import { _internalGetGlobalState, initLogger, login } from "braintrust";

interface BtqlResponse<T> {
  data?: T[];
}

interface BraintrustState {
  apiUrl: string;
  projectId: string;
}

// Cache the state but only for the current process lifetime
// This avoids issues with stale state from previous runs
let cachedState: BraintrustState | null = null;

async function ensureBraintrustState(): Promise<BraintrustState> {
  if (cachedState) {
    return cachedState;
  }

  const apiKey = process.env.BRAINTRUST_API_KEY;
  if (!apiKey) {
    throw new Error(
      "[braintrust] Missing BRAINTRUST_API_KEY env var. Cannot run BTQL query.",
    );
  }

  const projectName = process.env.BRAINTRUST_PROJECT_NAME || "customer-support-platform";

  // Login first to establish credentials
  await login({ apiKey });

  // Initialize logger to get project ID
  const logger = initLogger({
    projectName,
    apiKey,
  });

  // Get project ID from the logger
  const project = await logger.project;
  const projectId = project.id;

  // Derive the API URL from the SDK's global state
  const apiUrl = _internalGetGlobalState().apiUrl ?? "https://api.braintrust.dev";

  cachedState = { apiUrl, projectId };
  return cachedState;
}

export async function runBtql<T>(query: string): Promise<T[]> {
  const apiKey = process.env.BRAINTRUST_API_KEY;
  if (!apiKey) {
    console.warn(
      "[braintrust] Missing BRAINTRUST_API_KEY env var. Returning empty result.",
    );
    return [];
  }

  const { apiUrl } = await ensureBraintrustState();

  const response = await fetch(`${apiUrl}/btql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      use_columnstore: false,
      brainstore_realtime: true,
      query_source: "braintrust-evals-app",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `BTQL query failed (${response.status}): ${errorText || "Unknown error"}`,
    );
  }

  const json = (await response.json()) as BtqlResponse<T>;
  return json.data ?? [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BtqlQueryObject = Record<string, any>;

export async function runBtqlObject<T>(query: BtqlQueryObject): Promise<T[]> {
  const apiKey = process.env.BRAINTRUST_API_KEY;
  if (!apiKey) {
    console.warn(
      "[braintrust] Missing BRAINTRUST_API_KEY env var. Returning empty result.",
    );
    return [];
  }

  const { apiUrl } = await ensureBraintrustState();

  const response = await fetch(`${apiUrl}/btql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      use_columnstore: false,
      brainstore_realtime: true,
      query_source: "braintrust-evals-app",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `BTQL query failed (${response.status}): ${errorText || "Unknown error"}`,
    );
  }

  const json = (await response.json()) as BtqlResponse<T>;
  return json.data ?? [];
}

export async function getProjectId(): Promise<string> {
  const { projectId } = await ensureBraintrustState();
  return projectId;
}
