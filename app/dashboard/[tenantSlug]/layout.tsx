import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { db } from "@/db";

import { DashboardNav } from "../dashboard-nav";

interface DashboardTenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}

export default async function DashboardTenantLayout({
  children,
  params,
}: DashboardTenantLayoutProps): Promise<React.JSX.Element> {
  // Use auth() instead of currentUser() - it's cached and doesn't count against rate limits
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const { tenantSlug } = await params;

  const memberships = await db.query.tenantMembers.findMany({
    where: (tm, { eq }) => eq(tm.userId, userId),
    with: {
      tenant: true,
    },
  });

  if (memberships.length === 0) {
    redirect("/dashboard");
  }

  const activeMembership = memberships.find(
    (membership) => membership.tenant.slug === tenantSlug,
  );

  if (!activeMembership) {
    redirect(`/dashboard/${memberships[0].tenant.slug}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav
        tenants={memberships.map((membership) => ({
          id: membership.tenant.id,
          name: membership.tenant.name,
          slug: membership.tenant.slug,
          role: membership.role,
        }))}
        activeTenantSlug={tenantSlug}
      />
      <main className="pt-16">{children}</main>
    </div>
  );
}
