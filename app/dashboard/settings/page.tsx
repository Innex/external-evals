import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tenantMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await auth();
  
  const userTenants = await db.query.tenantMembers.findMany({
    where: eq(tenantMembers.userId, session!.user!.id!),
    with: { tenant: true },
  });

  if (userTenants.length === 0) {
    redirect("/dashboard/settings/new");
  }

  const activeTenant = userTenants[0].tenant;

  return (
    <div className="container py-8 px-6 max-w-3xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Configure your support bot
          </p>
        </div>
        <SettingsForm tenant={activeTenant} />
      </div>
    </div>
  );
}

