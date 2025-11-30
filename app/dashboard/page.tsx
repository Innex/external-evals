import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { tenantMembers, users } from "@/db/schema";

import { OnboardingView } from "./onboarding-view";

export default async function DashboardPage() {
  // Use auth() for the ID check (cached), only call currentUser() when we need profile data
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  let dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!dbUser) {
    // Only fetch full user profile when we need to create the DB record
    const clerkUser = await currentUser();
    if (!clerkUser) {
      redirect("/sign-in");
    }

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

  const memberships = await db.query.tenantMembers.findMany({
    where: eq(tenantMembers.userId, dbUser.id),
    with: {
      tenant: true,
    },
  });

  if (memberships.length === 0) {
    return <OnboardingView userName={dbUser.name ?? "there"} />;
  }

  redirect(`/dashboard/${memberships[0].tenant.slug}`);
}
