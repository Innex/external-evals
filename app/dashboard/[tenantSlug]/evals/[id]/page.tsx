import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { ArrowLeft, Clock, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { evals } from "@/db/schema";
import { fetchExperimentResults } from "@/lib/braintrust-experiment";
import { getTenantForUserOrThrow } from "@/lib/tenant-access";

import { EvalResultRow } from "./eval-result-row";

interface EvalDetailPageProps {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export default async function EvalDetailPage({
  params,
}: EvalDetailPageProps): Promise<React.JSX.Element> {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const { tenantSlug, id } = await params;
  const { tenant } = await getTenantForUserOrThrow(user.id, tenantSlug);

  const evalRecord = await db.query.evals.findFirst({
    where: eq(evals.id, id),
    with: {
      dataset: true,
    },
  });

  if (!evalRecord || evalRecord.tenantId !== tenant.id) {
    notFound();
  }

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600",
    running: "bg-blue-500/10 text-blue-600",
    completed: "bg-emerald-500/10 text-emerald-600",
    failed: "bg-rose-500/10 text-rose-600",
  };

  let experimentData: Awaited<ReturnType<typeof fetchExperimentResults>> | null = null;
  if (evalRecord.status === "completed" && evalRecord.braintrustExpId) {
    try {
      experimentData = await fetchExperimentResults(evalRecord.braintrustExpId);
    } catch (error) {
      console.error("Failed to fetch experiment results:", error);
    }
  }

  const passRate = experimentData?.passRate ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/${tenant.slug}/evals`}>
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{evalRecord.name}</h1>
          <p className="text-sm text-muted-foreground">
            {evalRecord.dataset?.name ?? "Unknown dataset"} •{" "}
            {evalRecord.startedAt?.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
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
              <p className="text-sm text-muted-foreground">Refresh to see updates.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {evalRecord.status === "failed" && Boolean(evalRecord.results) && (
        <Card className="border-rose-500/50">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 text-rose-500" />
              <div>
                <p className="font-medium text-rose-500">Evaluation failed</p>
                <pre className="mt-2 overflow-auto rounded bg-muted p-3 text-sm">
                  {(evalRecord.results as { error?: string })?.error ?? "Unknown error"}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {evalRecord.status === "completed" && experimentData && (
        <>
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total examples
              </p>
              <p className="mt-1 text-3xl font-bold">{experimentData.totalRows}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pass rate
              </p>
              <p className="mt-1 text-3xl font-bold">{Math.round(passRate * 100)}%</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all ${
                    passRate >= 0.7
                      ? "bg-emerald-500"
                      : passRate >= 0.4
                        ? "bg-amber-500"
                        : "bg-rose-500"
                  }`}
                  style={{ width: `${passRate * 100}%` }}
                />
              </div>
            </Card>
            {Object.entries(experimentData.avgScores).map(([name, score]) => (
              <Card key={name} className="p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {name}
                </p>
                <p className="mt-1 text-3xl font-bold">{Math.round(score * 100)}%</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full transition-all ${
                      score >= 0.7
                        ? "bg-emerald-500"
                        : score >= 0.4
                          ? "bg-amber-500"
                          : "bg-rose-500"
                    }`}
                    style={{ width: `${score * 100}%` }}
                  />
                </div>
              </Card>
            ))}
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] items-center gap-4 border-b bg-muted/50 px-6 py-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              <div className="w-6" />
              <div>Result</div>
              <div>Input</div>
              <div>Output</div>
              <div className="text-right">Scores</div>
            </div>
            <div className="divide-y">
              {experimentData.rows.map((row) => (
                <EvalResultRow
                  key={row.id}
                  row={row}
                  experimentId={evalRecord.braintrustExpId!}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {evalRecord.status === "completed" && !experimentData && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            <p>No experiment data available.</p>
            <p className="text-sm">
              The evaluation completed but results could not be fetched.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between border-t pt-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>
            Started: {evalRecord.startedAt?.toLocaleString() ?? "N/A"}
            {evalRecord.completedAt && (
              <> • Completed: {evalRecord.completedAt.toLocaleString()}</>
            )}
          </span>
        </div>
        {evalRecord.braintrustExpId && (
          <Badge variant="secondary" className="font-mono">
            {evalRecord.braintrustExpId}
          </Badge>
        )}
      </div>
    </div>
  );
}
