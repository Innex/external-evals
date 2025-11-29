import { getProjectId, runBtql } from "./braintrust-btql";

export interface BraintrustTurn {
  id: string;
  sessionId: string;
  tenantId: string;
  created: string;
  input?: unknown;
  output?: unknown;
  modelName?: string;
  modelProvider?: string;
}

interface BtqlTurnRow {
  id: string;
  created: string;
  sessionId?: string;
  tenantId?: string;
  modelName?: string;
  modelProvider?: string;
  input?: unknown;
  output?: unknown;
}

const DEFAULT_TURN_LIMIT = 200;

export async function fetchBraintrustTurns(params: {
  tenantId: string;
  limit?: number;
}): Promise<BraintrustTurn[]> {
  const { tenantId, limit = DEFAULT_TURN_LIMIT } = params;
  if (!tenantId) {
    return [];
  }

  // Get the project ID from the logger (not project name)
  const projectId = await getProjectId();
  const escapedTenantId = tenantId.replace(/'/g, "''");

  // BTQL uses SQL-like syntax with project ID
  const query = `
select
  id,
  created,
  input,
  output,
  metadata.sessionId as sessionId,
  metadata.tenantId as tenantId,
  metadata.modelName as modelName,
  metadata.modelProvider as modelProvider
from project_logs('${projectId}')
where span_attributes.name = 'chat-turn' and metadata.tenantId = '${escapedTenantId}'
order by created desc
limit ${limit}
`.trim();

  const rows = await runBtql<BtqlTurnRow>(query);
  return rows
    .filter((row) => row.sessionId && row.tenantId === tenantId)
    .map(
      (row): BraintrustTurn => ({
        id: row.id,
        sessionId: row.sessionId!,
        tenantId: row.tenantId!,
        created: row.created,
        input: row.input,
        output: row.output,
        modelName: row.modelName,
        modelProvider: row.modelProvider,
      }),
    );
}

export function formatTurnText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function getTurnTimestamp(turn: BraintrustTurn): number {
  return turn.created ? new Date(turn.created).getTime() : 0;
}
