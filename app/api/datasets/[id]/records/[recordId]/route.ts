import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { datasets } from "@/db/schema";
import { deleteDatasetRecord, updateDatasetRecord } from "@/lib/braintrust-dataset";

const updateRecordSchema = z.object({
  expected: z.unknown(),
});

interface RouteParams {
  params: Promise<{ id: string; recordId: string }>;
}

// GET endpoint removed - we don't need to fetch individual records via BTQL
// The dataset list page fetches all records for a dataset

export async function PATCH(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id: datasetId, recordId } = await params;
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
  const parsed = updateRecordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    // Update the record directly - the SDK will handle if it doesn't exist
    await updateDatasetRecord({
      recordId,
      expected: parsed.data.expected,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating dataset record:", error);
    return NextResponse.json(
      { error: "Failed to update record in Braintrust" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id: datasetId, recordId } = await params;
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
    // Delete the record directly - the SDK will handle if it doesn't exist
    await deleteDatasetRecord(recordId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting dataset record:", error);
    return NextResponse.json(
      { error: "Failed to delete record from Braintrust" },
      { status: 500 },
    );
  }
}
