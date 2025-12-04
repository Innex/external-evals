import { initDataset } from "braintrust";

// All saved conversations go into a single Braintrust dataset
const DATASET_NAME = "saved_conversations";

interface DatasetRecordMetadata {
  dataset_id: string; // Our Postgres dataset ID
  customer_id: string; // Tenant ID
  session_id: string;
  turn_id?: string;
  created_at?: string;
}

export interface DatasetRecord {
  id: string;
  input: unknown;
  expected: unknown;
  metadata: DatasetRecordMetadata;
  created: string;
}

let cachedDataset: Awaited<ReturnType<typeof initDataset>> | null = null;

async function getDataset(): Promise<Awaited<ReturnType<typeof initDataset>>> {
  if (cachedDataset) {
    return cachedDataset;
  }

  const apiKey = process.env.BRAINTRUST_API_KEY;
  if (!apiKey) {
    throw new Error("BRAINTRUST_API_KEY is required for dataset operations");
  }

  const projectName = process.env.BRAINTRUST_PROJECT_NAME || "customer-support-platform";

  cachedDataset = initDataset({
    project: projectName,
    dataset: DATASET_NAME,
    apiKey,
  });

  return cachedDataset;
}

export async function insertDatasetRecord(params: {
  datasetId: string; // Our Postgres dataset ID
  customerId: string; // Tenant ID
  sessionId: string;
  turnId?: string;
  input: unknown; // Conversation history up to this point
  expected: unknown; // The expected/corrected answer
}): Promise<string> {
  const dataset = await getDataset();

  const record = dataset.insert({
    input: params.input,
    expected: params.expected,
    metadata: {
      dataset_id: params.datasetId,
      customer_id: params.customerId,
      session_id: params.sessionId,
      turn_id: params.turnId,
      created_at: new Date().toISOString(),
    },
  });

  // Flush to ensure the record is persisted
  await dataset.flush();

  return record;
}

export async function updateDatasetRecord(params: {
  recordId: string;
  expected: unknown;
}): Promise<void> {
  const dataset = await getDataset();

  dataset.update({
    id: params.recordId,
    expected: params.expected,
  });

  await dataset.flush();

  // Clear cache so next fetch gets fresh data
  cachedDataset = null;
}

export async function deleteDatasetRecord(recordId: string): Promise<void> {
  const dataset = await getDataset();

  dataset.delete(recordId);

  await dataset.flush();

  // Clear cache so next fetch gets fresh data
  cachedDataset = null;
}

export async function fetchDatasetRecords(params: {
  datasetId: string; // Our Postgres dataset ID
  limit?: number;
}): Promise<DatasetRecord[]> {
  const { datasetId, limit = 100 } = params;

  // Don't use cached dataset for fetching - get a fresh one to see latest data
  const apiKey = process.env.BRAINTRUST_API_KEY;
  if (!apiKey) {
    throw new Error("BRAINTRUST_API_KEY is required for dataset operations");
  }

  const projectName = process.env.BRAINTRUST_PROJECT_NAME || "customer-support-platform";

  const dataset = initDataset({
    project: projectName,
    dataset: DATASET_NAME,
    apiKey,
    _internal_btql: { filter: { btql: `metadata.dataset_id = '${datasetId}'` } },
  });

  // Use the SDK's fetch to iterate through records
  const records: DatasetRecord[] = [];

  for await (const record of dataset.fetch()) {
    // Filter by our Postgres dataset ID in metadata
    const metadata = record.metadata as DatasetRecordMetadata;
    records.push({
      id: record.id,
      input: record.input,
      expected: record.expected,
      metadata: metadata,
      created: metadata.created_at ?? new Date().toISOString(),
    });

    if (records.length >= limit) {
      break;
    }
  }

  return records;
}
