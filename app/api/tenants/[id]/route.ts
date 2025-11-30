import { currentUser } from "@clerk/nextjs/server";
import { and, eq, inArray } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { datasets, documents, evals, tenantMembers, tenants } from "@/db/schema";

const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  welcomeMessage: z.string().optional(),
  instructions: z.string().optional(),
  modelProvider: z.enum(["openai", "anthropic", "google"]).optional(),
  modelName: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  widgetEnabled: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this tenant
    const member = await db.query.tenantMembers.findFirst({
      where: and(eq(tenantMembers.userId, user.id), eq(tenantMembers.tenantId, id)),
    });

    if (!member) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const data = updateTenantSchema.parse(body);

    // Update tenant
    const [updated] = await db
      .update(tenants)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating tenant:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid data", errors: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, id),
    });

    if (!tenant) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    // Verify user has access
    const member = await db.query.tenantMembers.findFirst({
      where: and(eq(tenantMembers.userId, user.id), eq(tenantMembers.tenantId, id)),
    });

    if (!member) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("Error fetching tenant:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const membership = await db.query.tenantMembers.findFirst({
      where: and(eq(tenantMembers.userId, user.id), eq(tenantMembers.tenantId, id)),
    });

    if (!membership || membership.role !== "owner") {
      return NextResponse.json(
        { message: "Only the bot owner can delete this bot" },
        { status: 403 },
      );
    }

    // Delete tenant and all related data
    // Note: conversations/traces are stored in Braintrust, not Postgres
    await db.transaction(async (tx) => {
      // Get all dataset IDs for this tenant to delete evals first
      const tenantDatasetIds = await tx
        .select({ id: datasets.id })
        .from(datasets)
        .where(eq(datasets.tenantId, id));

      if (tenantDatasetIds.length > 0) {
        await tx.delete(evals).where(
          inArray(
            evals.datasetId,
            tenantDatasetIds.map((ds) => ds.id),
          ),
        );
      }

      await tx.delete(datasets).where(eq(datasets.tenantId, id));
      await tx.delete(documents).where(eq(documents.tenantId, id));
      await tx.delete(tenantMembers).where(eq(tenantMembers.tenantId, id));
      await tx.delete(tenants).where(eq(tenants.id, id));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tenant:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
