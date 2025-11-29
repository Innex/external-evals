import { currentUser } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { ChevronRight, Database } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

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

export default async function DatasetsPage(): Promise<JSX.Element> {
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
  });

  return (
    <div className="container space-y-6 px-6 py-8">
      <div>
        <h1 className="text-3xl font-bold">Datasets</h1>
        <p className="text-muted-foreground">
          Saved conversation examples for evaluation. Create datasets by saving responses
          from Conversations.
        </p>
      </div>

      {allDatasets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Database className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No datasets yet</h3>
            <p className="mb-4 text-muted-foreground">
              Datasets are created when you save examples from conversations. Go to
              Conversations → click a conversation → click &quot;Save to dataset&quot; on
              any response.
            </p>
            <Link href="/dashboard/conversations">
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                View conversations
              </button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allDatasets.map((dataset) => (
            <Link key={dataset.id} href={`/dashboard/datasets/${dataset.id}`}>
              <Card className="h-full cursor-pointer transition-shadow hover:border-primary/50 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-brand-500" />
                      {dataset.name}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                  <CardDescription>
                    Created {formatRelativeTime(dataset.createdAt)}
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
