"use server";

import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db";
import { evals } from "@/db/schema";

interface EvalDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EvalDetailPage({
  params,
}: EvalDetailPageProps): Promise<JSX.Element> {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const { id } = await params;

  const evalRecord = await db.query.evals.findFirst({
    where: eq(evals.id, id),
    with: {
      dataset: true,
    },
  });

  if (!evalRecord) {
    notFound();
  }

  // Verify user has access to this tenant
  const membership = await db.query.tenantMembers.findFirst({
    where: (tm, { and, eq: equals }) =>
      and(equals(tm.userId, user.id), equals(tm.tenantId, evalRecord.tenantId)),
  });

  if (!membership) {
    notFound();
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-500",
    running: "bg-blue-500/10 text-blue-500",
    completed: "bg-green-500/10 text-green-500",
    failed: "bg-red-500/10 text-red-500",
  };

  const summary = evalRecord.summary as Record<string, unknown> | null;
  const results = evalRecord.results as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/evals">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{evalRecord.name}</h1>
          <p className="text-sm text-muted-foreground">
            Evaluation run on {evalRecord.dataset?.name ?? "Unknown dataset"}
          </p>
        </div>
        <Badge className={statusColors[evalRecord.status] ?? ""}>
          {evalRecord.status === "running" && (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          )}
          {evalRecord.status}
        </Badge>
      </div>

      {evalRecord.status === "running" && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">Evaluation in progress...</p>
              <p className="text-sm text-muted-foreground">
                This page will update when complete. You can also refresh.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {evalRecord.status === "completed" && summary && (
        <>
          {/* Scores from Braintrust summary */}
          {summary.scores &&
            typeof summary.scores === "object" &&
            Object.keys(summary.scores as Record<string, unknown>).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Scores</CardTitle>
                  <CardDescription>Average scores across all examples</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(summary.scores as Record<string, unknown>).map(
                      ([scoreName, scoreData]) => {
                        // Braintrust returns ScoreSummary with score, name, etc.
                        const data = scoreData as {
                          score?: number;
                          name?: string;
                        };
                        const score = data?.score ?? 0;
                        return (
                          <div key={scoreName} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">
                                {data?.name ?? scoreName}
                              </span>
                              <span>{(score * 100).toFixed(1)}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${score * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Metrics from Braintrust summary */}
          {summary.metrics &&
            typeof summary.metrics === "object" &&
            Object.keys(summary.metrics as Record<string, unknown>).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Metrics</CardTitle>
                  <CardDescription>
                    Performance metrics from the evaluation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {Object.entries(summary.metrics as Record<string, unknown>).map(
                      ([metricName, metricData]) => {
                        const data = metricData as {
                          metric?: number;
                          name?: string;
                        };
                        return (
                          <div key={metricName} className="text-center">
                            <p className="text-sm text-muted-foreground">
                              {data?.name ?? metricName}
                            </p>
                            <p className="text-2xl font-bold">
                              {typeof data?.metric === "number"
                                ? data.metric.toFixed(2)
                                : "-"}
                            </p>
                          </div>
                        );
                      },
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
        </>
      )}

      {evalRecord.status === "failed" && results && (
        <Card className="border-red-500/50">
          <CardHeader>
            <CardTitle className="text-red-500">Evaluation failed</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded bg-muted p-4 text-sm">
              {(results.error as string) ?? "Unknown error"}
            </pre>
          </CardContent>
        </Card>
      )}

      {evalRecord.braintrustExpId && (
        <Card>
          <CardHeader>
            <CardTitle>Braintrust experiment</CardTitle>
            <CardDescription>
              View detailed results and comparisons in Braintrust
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={`https://www.braintrust.dev/app/experiment/${evalRecord.braintrustExpId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in Braintrust
              </Button>
            </a>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Parameters</CardTitle>
          <CardDescription>Configuration used for this evaluation</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded bg-muted p-4 text-sm">
            {JSON.stringify(evalRecord.parameters, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        <p>Started: {evalRecord.startedAt?.toLocaleString() ?? "N/A"}</p>
        {evalRecord.completedAt && (
          <p>Completed: {evalRecord.completedAt.toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}
