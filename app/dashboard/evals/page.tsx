import { currentUser } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { CheckCircle, Clock, FlaskConical, Loader2, Play, XCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { datasets, evals, tenantMembers } from "@/db/schema";
import { formatRelativeTime } from "@/lib/utils";

export default async function EvalsPage() {
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
        <p className="text-muted-foreground">Create a bot first to run evaluations.</p>
      </div>
    );
  }

  const activeTenant = userTenants[0].tenant;

  // Get all datasets for this tenant
  const tenantDatasets = await db.query.datasets.findMany({
    where: eq(datasets.tenantId, activeTenant.id),
  });

  // Get all evals
  const allEvals = await db.query.evals.findMany({
    where: eq(evals.tenantId, activeTenant.id),
    orderBy: [desc(evals.createdAt)],
    with: {
      dataset: true,
    },
  });

  const hasDatasets = tenantDatasets.length > 0;

  return (
    <div className="container space-y-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Evaluations</h1>
          <p className="text-muted-foreground">
            Run and view evaluation results for your support bot
          </p>
        </div>
        {hasDatasets && (
          <Link href="/dashboard/evals/new">
            <Button>
              <Play className="mr-2 h-4 w-4" />
              Run evaluation
            </Button>
          </Link>
        )}
      </div>

      {allEvals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FlaskConical className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No evaluations yet</h3>
            <p className="mb-4 text-muted-foreground">
              {hasDatasets
                ? "Run your first evaluation to measure your bot's performance."
                : "Create a dataset first by annotating traces, then run evaluations."}
            </p>
            {hasDatasets ? (
              <Link href="/dashboard/evals/new">
                <Button>
                  <Play className="mr-2 h-4 w-4" />
                  Run first evaluation
                </Button>
              </Link>
            ) : (
              <Link href="/dashboard/traces">
                <Button>View traces</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {allEvals.map((evalRun) => (
            <Link key={evalRun.id} href={`/dashboard/evals/${evalRun.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <StatusIcon status={evalRun.status} />
                      </div>
                      <div>
                        <h3 className="font-medium">{evalRun.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Dataset: {evalRun.dataset.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={evalRun.status} />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatRelativeTime(evalRun.createdAt)}
                      </p>
                    </div>
                  </div>
                  {evalRun.summary && (
                    <div className="mt-3 border-t pt-3">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        {Object.entries(evalRun.summary as Record<string, number>).map(
                          ([key, value]) => (
                            <div key={key}>
                              <p className="capitalize text-muted-foreground">{key}</p>
                              <p className="font-medium">
                                {typeof value === "number" ? value.toFixed(2) : value}
                              </p>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-6 w-6 text-green-500" />;
    case "failed":
      return <XCircle className="h-6 w-6 text-red-500" />;
    case "running":
      return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />;
    default:
      return <Clock className="h-6 w-6 text-yellow-500" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    completed: "default",
    failed: "destructive",
    running: "secondary",
    pending: "outline",
  };

  return <Badge variant={variants[status] ?? "outline"}>{status}</Badge>;
}
