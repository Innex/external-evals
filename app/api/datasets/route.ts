import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { datasets, tenantMembers } from "@/db/schema";

const createDatasetSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  tenantId: z.string(),
});

export async function GET(): Promise<NextResponse> {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's tenants
  const userTenants = await db.query.tenantMembers.findMany({
    where: eq(tenantMembers.userId, user.id),
  });

  if (userTenants.length === 0) {
    return NextResponse.json({ datasets: [] });
  }

  const tenantIds = userTenants.map((t) => t.tenantId);

  // Get datasets for user's tenants
  const userDatasets = await db.query.datasets.findMany({
    where: (ds, { inArray }) => inArray(ds.tenantId, tenantIds),
    orderBy: (ds, { desc }) => [desc(ds.createdAt)],
  });

  return NextResponse.json({ datasets: userDatasets });
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createDatasetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, description, tenantId } = parsed.data;

  // Verify user has access to this tenant
  const membership = await db.query.tenantMembers.findFirst({
    where: (tm, { and, eq: equals }) =>
      and(equals(tm.userId, user.id), equals(tm.tenantId, tenantId)),
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check if dataset with this name already exists for this tenant
  const existing = await db.query.datasets.findFirst({
    where: (ds, { and, eq: equals }) =>
      and(equals(ds.tenantId, tenantId), equals(ds.name, name)),
  });

  if (existing) {
    return NextResponse.json(
      { error: "A dataset with this name already exists" },
      { status: 409 },
    );
  }

  // Create the dataset
  const [newDataset] = await db
    .insert(datasets)
    .values({
      name,
      description,
      tenantId,
    })
    .returning();

  return NextResponse.json({ dataset: newDataset }, { status: 201 });
}
