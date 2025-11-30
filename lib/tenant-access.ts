import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { tenantMembers, tenants } from "@/db/schema";

export async function getTenantForUserOrThrow(userId: string, slug: string) {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, slug),
  });

  if (!tenant) {
    notFound();
  }

  const membership = await db.query.tenantMembers.findFirst({
    where: and(eq(tenantMembers.userId, userId), eq(tenantMembers.tenantId, tenant.id)),
  });

  if (!membership) {
    notFound();
  }

  return { tenant, membership };
}

export async function getAllTenantsForUser(userId: string) {
  const memberships = await db.query.tenantMembers.findMany({
    where: eq(tenantMembers.userId, userId),
    with: {
      tenant: true,
    },
  });

  return memberships.map((membership) => membership.tenant);
}
