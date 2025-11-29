import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tenantMembers, datasets, datasetExamples } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";
import { Database, Plus } from "lucide-react";

export default async function DatasetsPage() {
  const session = await auth();
  
  const userTenants = await db.query.tenantMembers.findMany({
    where: eq(tenantMembers.userId, session!.user!.id!),
    with: { tenant: true },
  });

  if (userTenants.length === 0) {
    return (
      <div className="container py-8 px-6">
        <p className="text-muted-foreground">Create a bot first to manage datasets.</p>
      </div>
    );
  }

  const activeTenant = userTenants[0].tenant;

  const allDatasets = await db.query.datasets.findMany({
    where: eq(datasets.tenantId, activeTenant.id),
    orderBy: [desc(datasets.createdAt)],
    with: {
      examples: true,
    },
  });

  return (
    <div className="container py-8 px-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Datasets</h1>
          <p className="text-muted-foreground">
            Manage evaluation datasets for your support bot
          </p>
        </div>
        <Button disabled>
          <Plus className="w-4 h-4 mr-2" />
          Create dataset
        </Button>
      </div>

      {allDatasets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No datasets yet</h3>
            <p className="text-muted-foreground mb-4">
              Datasets are created automatically when you save examples from traces.
              Go to Traces → select a trace → Annotate → Save to dataset.
            </p>
            <Link href="/dashboard/traces">
              <Button>View traces</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allDatasets.map((dataset) => (
            <Link key={dataset.id} href={`/dashboard/datasets/${dataset.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="w-5 h-5 text-brand-500" />
                    {dataset.name}
                  </CardTitle>
                  <CardDescription>
                    {dataset.examples.length} examples • {formatRelativeTime(dataset.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {dataset.description || "No description"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

