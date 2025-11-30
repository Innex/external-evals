import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { datasets } from "@/db/schema";
import { getTenantForUserOrThrow } from "@/lib/tenant-access";

import { RunEvalForm } from "./run-eval-form";

interface NewEvalPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function NewEvalPage({ params }: NewEvalPageProps) {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { tenantSlug } = await params;
  const { tenant } = await getTenantForUserOrThrow(user.id, tenantSlug);

  const tenantDatasets = await db.query.datasets.findMany({
    where: eq(datasets.tenantId, tenant.id),
    orderBy: (ds, { desc }) => [desc(ds.createdAt)],
  });

  if (tenantDatasets.length === 0) {
    redirect(`/dashboard/${tenant.slug}/datasets`);
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
        tenantId={tenant.id}
        tenantSlug={tenant.slug}
        datasets={tenantDatasets.map((d) => ({
          id: d.id,
          name: d.name,
        }))}
      />
    </div>
  );
}
