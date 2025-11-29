import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { tenantMembers, users } from "@/db/schema";

/**
 * Get the current user from Clerk and ensure they exist in our database.
 * Creates a new user record if this is their first sign-in.
 */
export async function getCurrentUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  // Check if user exists in our database
  let dbUser = await db.query.users.findFirst({
    where: eq(users.id, clerkUser.id),
  });

  // If not, create them
  if (!dbUser) {
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) {
      throw new Error("User has no email address");
    }

    const [newUser] = await db
      .insert(users)
      .values({
        id: clerkUser.id,
        email,
        name: clerkUser.fullName ?? clerkUser.firstName ?? "User",
        image: clerkUser.imageUrl,
        emailVerified: new Date(),
      })
      .returning();

    dbUser = newUser;
  }

  return dbUser;
}

/**
 * Get all tenants the current user belongs to.
 */
export async function getUserTenants() {
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  const memberships = await db.query.tenantMembers.findMany({
    where: eq(tenantMembers.userId, user.id),
    with: {
      tenant: true,
    },
  });

  return memberships.map((m) => ({
    ...m.tenant,
    role: m.role,
  }));
}

/**
 * Get the user's active/first tenant.
 * In the future, this could be stored in a cookie or session for tenant switching.
 */
export async function getActiveTenant() {
  const userTenants = await getUserTenants();
  return userTenants[0] ?? null;
}

/**
 * Verify the user has access to a specific tenant.
 */
export async function verifyTenantAccess(tenantId: string) {
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  const membership = await db.query.tenantMembers.findFirst({
    where: (tm, { and }) => and(eq(tm.userId, user.id), eq(tm.tenantId, tenantId)),
  });

  return !!membership;
}

/**
 * Re-export Clerk's auth for API route protection.
 */
export { auth, currentUser };
