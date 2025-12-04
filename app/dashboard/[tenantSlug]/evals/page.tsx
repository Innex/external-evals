import { currentUser } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { CheckCircle, Clock, FlaskConical, Loader2, Play, XCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { datasets, evals } from "@/db/schema";
import { getTenantForUserOrThrow } from "@/lib/tenant-access";
import { formatRelativeTime } from "@/lib/utils";

interface EvalsPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function EvalsPage({ params }: EvalsPageProps) {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { tenantSlug } = await params;
  const { tenant } = await getTenantForUserOrThrow(user.id, tenantSlug);

  const tenantDatasets = await db.query.datasets.findMany({
    where: eq(datasets.tenantId, tenant.id),
  });

  const allEvals = await db.query.evals.findMany({
    where: eq(evals.tenantId, tenant.id),
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
            Run and view evaluation results for your bot
          </p>
        </div>
        {hasDatasets && (
          <Link href={`/dashboard/${tenant.slug}/evals/new`}>
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
              <Link href={`/dashboard/${tenant.slug}/evals/new`}>
                <Button>
                  <Play className="mr-2 h-4 w-4" />
                  Run first evaluation
                </Button>
              </Link>
            ) : (
              <Link href={`/dashboard/${tenant.slug}/conversations`}>
                <Button>View conversations</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {allEvals.map((evalRun) => (
            <Link key={evalRun.id} href={`/dashboard/${tenant.slug}/evals/${evalRun.id}`}>
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
                          Dataset: {evalRun.dataset?.name ?? "Unknown"}
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
                  {Boolean(evalRun.summary) && (
                    <div className="mt-3 border-t pt-3">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <SummaryDisplay
                          summary={evalRun.summary as Record<string, unknown>}
                        />
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

function SummaryDisplay({ summary }: { summary: Record<string, unknown> }) {
  const items: { key: string; value: string }[] = [];

  if (summary.scores && typeof summary.scores === "object") {
    for (const [name, data] of Object.entries(
      summary.scores as Record<string, unknown>,
    )) {
      const scoreData = data as { score?: number; name?: string } | null;
      if (scoreData?.score !== undefined) {
        items.push({
          key: scoreData.name ?? name,
          value: `${Math.round(scoreData.score * 100)}%`,
        });
      }
    }
  }

  if (summary.metrics && typeof summary.metrics === "object") {
    for (const [name, data] of Object.entries(
      summary.metrics as Record<string, unknown>,
    )) {
      const metricData = data as { metric?: number; name?: string } | null;
      if (metricData?.metric !== undefined) {
        items.push({
          key: metricData.name ?? name,
          value: metricData.metric.toFixed(2),
        });
      }
    }
  }

  for (const [key, value] of Object.entries(summary)) {
    if (
      key !== "scores" &&
      key !== "metrics" &&
      key !== "experimentName" &&
      key !== "experimentUrl"
    ) {
      if (typeof value === "number") {
        items.push({ key, value: value.toFixed(2) });
      } else if (typeof value === "string") {
        items.push({ key, value });
      }
    }
  }

  if (items.length === 0) return null;

  return (
    <>
      {items.slice(0, 3).map(({ key, value }) => (
        <div key={key}>
          <p className="capitalize text-muted-foreground">{key}</p>
          <p className="font-medium">{value}</p>
        </div>
      ))}
    </>
  );
}
