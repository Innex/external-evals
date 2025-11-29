import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { datasets, tenantMembers } from "@/db/schema";

import { RunEvalForm } from "./run-eval-form";

export default async function NewEvalPage(): Promise<JSX.Element> {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const userTenants = await db.query.tenantMembers.findMany({
    where: eq(tenantMembers.userId, user.id),
    with: { tenant: true },
  });

  if (userTenants.length === 0) {
    redirect("/dashboard");
  }

  const activeTenant = userTenants[0].tenant;

  // Get all datasets for this tenant
  const tenantDatasets = await db.query.datasets.findMany({
    where: eq(datasets.tenantId, activeTenant.id),
    orderBy: (ds, { desc }) => [desc(ds.createdAt)],
  });

  if (tenantDatasets.length === 0) {
    redirect("/dashboard/datasets");
  }

  return (
    <div className="container max-w-2xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-3xl font-bold">Run evaluation</h1>
        <p className="text-muted-foreground">
          Test your bot against a dataset to measure performance
        </p>
      </div>

      <RunEvalForm
        tenantId={activeTenant.id}
        datasets={tenantDatasets.map((d) => ({
          id: d.id,
          name: d.name,
        }))}
      />
    </div>
  );
}
