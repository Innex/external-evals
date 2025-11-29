import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { datasets } from "@/db/schema";
import { fetchDatasetRecords, insertDatasetRecord } from "@/lib/braintrust-dataset";

const insertRecordSchema = z.object({
  sessionId: z.string(),
  turnId: z.string().optional(),
  input: z.unknown(),
  expected: z.unknown(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id: datasetId } = await params;
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the dataset
  const dataset = await db.query.datasets.findFirst({
    where: eq(datasets.id, datasetId),
  });

  if (!dataset) {
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }

  // Verify user has access to this tenant
  const membership = await db.query.tenantMembers.findFirst({
    where: (tm, { and, eq: equals }) =>
      and(equals(tm.userId, user.id), equals(tm.tenantId, dataset.tenantId)),
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const records = await fetchDatasetRecords({ datasetId });
    return NextResponse.json({ records });
  } catch (error) {
    console.error("Error fetching dataset records:", error);
    return NextResponse.json(
      { error: "Failed to fetch records from Braintrust" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id: datasetId } = await params;
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the dataset
  const dataset = await db.query.datasets.findFirst({
    where: eq(datasets.id, datasetId),
  });

  if (!dataset) {
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }

  // Verify user has access to this tenant
  const membership = await db.query.tenantMembers.findFirst({
    where: (tm, { and, eq: equals }) =>
      and(equals(tm.userId, user.id), equals(tm.tenantId, dataset.tenantId)),
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = insertRecordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { sessionId, turnId, input, expected } = parsed.data;

  try {
    const recordId = await insertDatasetRecord({
      datasetId,
      customerId: dataset.tenantId,
      sessionId,
      turnId,
      input,
      expected,
    });

    return NextResponse.json({ recordId }, { status: 201 });
  } catch (error) {
    console.error("Error inserting dataset record:", error);
    return NextResponse.json(
      { error: "Failed to insert record into Braintrust" },
      { status: 500 },
    );
  }
}
