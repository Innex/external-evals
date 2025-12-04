import { currentUser } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { datasets, evals, tenants } from "@/db/schema";
import { runEvaluation } from "@/lib/braintrust-eval";
import { completeChatTurn } from "@/lib/chat-engine";

const runEvalSchema = z.object({
  name: z.string().optional(), // Optional - Braintrust will auto-generate if not provided
  datasetId: z.string(),
  tenantId: z.string(),
});

export async function POST(request: Request): Promise<NextResponse> {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = runEvalSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, datasetId, tenantId } = parsed.data;
  const evalName = name || `eval-${Date.now()}`; // Generate name if not provided

  // Verify user has access to this tenant
  const membership = await db.query.tenantMembers.findFirst({
    where: (tm, { and, eq: equals }) =>
      and(equals(tm.userId, user.id), equals(tm.tenantId, tenantId)),
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get the tenant config
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  // Get the dataset
  const dataset = await db.query.datasets.findFirst({
    where: eq(datasets.id, datasetId),
  });

  if (!dataset) {
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }

  // Create the eval record
  const [evalRecord] = await db
    .insert(evals)
    .values({
      name: evalName,
      status: "running",
      tenantId,
      datasetId,
      parameters: {
        modelProvider: tenant.modelProvider,
        modelName: tenant.modelName,
        temperature: tenant.temperature,
        instructions: tenant.instructions,
      },
      startedAt: new Date(),
    })
    .returning();

  // Run the evaluation in the background
  // Note: In production, you'd want to use a proper job queue
  // Always append a unique suffix to experiment names to avoid conflicts with
  // experiments from other projects that the SDK might try to reference as baselines
  const uniqueExperimentName = name
    ? `${name}-${Date.now()}`
    : `eval-${Date.now()}`;

  runEvaluationAsync(evalRecord.id, {
    experimentName: uniqueExperimentName,
    datasetId,
    tenant,
  }).catch(console.error);

  return NextResponse.json({ eval: evalRecord }, { status: 201 });
}

async function runEvaluationAsync(
  evalId: string,
  params: {
    experimentName?: string; // Optional user-provided name
    datasetId: string;
    tenant: typeof tenants.$inferSelect;
  },
): Promise<void> {
  try {
    const { experimentName, datasetId, tenant } = params;

    // Run the evaluation
    const summary = await runEvaluation({
      datasetId,
      tenantId: tenant.id,
      task: async (input: { role: string; content: string }[]) => {
        const messages = input.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        const response = await completeChatTurn({
          tenant,
          messages,
          sessionId: `eval-${tenant.id}-${evalId}-${randomUUID()}`,
          spanName: "chat-turn",
        });

        return response;
      },
      experimentName, // Pass through - Braintrust will auto-deduplicate
      metadata: {
        tenantId: tenant.id,
        modelProvider: tenant.modelProvider,
        modelName: tenant.modelName,
      },
    });

    // Update the eval record with results from Braintrust summary
    await db
      .update(evals)
      .set({
        status: "completed",
        results: summary,
        summary: {
          scores: summary.scores,
          metrics: summary.metrics,
          experimentName: summary.experimentName,
          experimentUrl: summary.experimentUrl,
        },
        braintrustExpId: summary.experimentId,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(evals.id, evalId));
  } catch (error) {
    console.error("Evaluation failed:", error);

    // Update the eval record with failure
    await db
      .update(evals)
      .set({
        status: "failed",
        results: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(evals.id, evalId));
  }
}
