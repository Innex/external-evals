import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { getTenantForUserOrThrow } from "@/lib/tenant-access";

import { SettingsForm } from "../../settings/settings-form";

interface SettingsPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { tenantSlug } = await params;
  const { tenant } = await getTenantForUserOrThrow(user.id, tenantSlug);

  const tenantRecord = await db.query.tenants.findFirst({
    where: (t, { eq }) => eq(t.id, tenant.id),
  });

  if (!tenantRecord) {
    redirect("/dashboard");
  }

  return (
    <div className="container max-w-2xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-3xl font-bold">Bot settings</h1>
        <p className="text-muted-foreground">
          Configure instructions, welcome message, and provider credentials.
        </p>
      </div>

      <SettingsForm tenant={tenantRecord} />
    </div>
  );
}
