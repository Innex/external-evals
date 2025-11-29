import { currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { datasetExamples, datasets, tenantMembers, traces } from "@/db/schema";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { expectedOutput?: unknown };
    const { expectedOutput } = body;

    // Get trace
    const trace = await db.query.traces.findFirst({
      where: eq(traces.id, id),
    });

    if (!trace) {
      return NextResponse.json({ message: "Trace not found" }, { status: 404 });
    }

    // Verify user has access to this tenant
    const member = await db.query.tenantMembers.findFirst({
      where: and(
        eq(tenantMembers.userId, user.id),
        eq(tenantMembers.tenantId, trace.tenantId),
      ),
    });

    if (!member) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get or create default dataset
    let dataset = await db.query.datasets.findFirst({
      where: eq(datasets.tenantId, trace.tenantId),
    });

    if (!dataset) {
      [dataset] = await db
        .insert(datasets)
        .values({
          name: "Default Dataset",
          description: "Automatically created dataset for collected examples",
          tenantId: trace.tenantId,
        })
        .returning();
    }

    // Create dataset example
    await db.insert(datasetExamples).values({
      datasetId: dataset.id,
      input: trace.input,
      expectedOutput: expectedOutput ?? trace.output,
      sourceTraceId: trace.id,
      metadata: {
        modelProvider: trace.modelProvider,
        modelName: trace.modelName,
      },
    });

    // Mark trace as annotated
    await db
      .update(traces)
      .set({
        expectedOutput,
        isAnnotated: true,
        annotatedAt: new Date(),
        annotatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(traces.id, id));

    return NextResponse.json({ success: true, datasetId: dataset.id });
  } catch (error) {
    console.error("Error saving to dataset:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
