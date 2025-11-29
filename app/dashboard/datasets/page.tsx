import { currentUser } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { Database, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db";
import { datasets, tenantMembers } from "@/db/schema";
import { formatRelativeTime } from "@/lib/utils";

export default async function DatasetsPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const userTenants = await db.query.tenantMembers.findMany({
    where: eq(tenantMembers.userId, user.id),
    with: { tenant: true },
  });

  if (userTenants.length === 0) {
    return (
      <div className="container px-6 py-8">
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
    <div className="container space-y-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Datasets</h1>
          <p className="text-muted-foreground">
            Manage evaluation datasets for your support bot
          </p>
        </div>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          Create dataset
        </Button>
      </div>

      {allDatasets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Database className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No datasets yet</h3>
            <p className="mb-4 text-muted-foreground">
              Datasets are created automatically when you save examples from traces. Go to
              Traces → select a trace → Annotate → Save to dataset.
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
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Database className="h-5 w-5 text-brand-500" />
                    {dataset.name}
                  </CardTitle>
                  <CardDescription>
                    {dataset.examples.length} examples •{" "}
                    {formatRelativeTime(dataset.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {dataset.description ?? "No description"}
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
