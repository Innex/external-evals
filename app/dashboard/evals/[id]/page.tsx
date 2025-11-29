import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { ArrowLeft, Clock, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { evals } from "@/db/schema";
import { fetchExperimentResults } from "@/lib/braintrust-experiment";

import { EvalResultRow } from "./eval-result-row";

interface EvalDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EvalDetailPage({
  params,
}: EvalDetailPageProps): Promise<React.JSX.Element> {
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

  const results = evalRecord.results as Record<string, unknown> | null;

  // Fetch experiment results from Braintrust if completed
  let experimentData: Awaited<ReturnType<typeof fetchExperimentResults>> | null = null;
  if (evalRecord.status === "completed" && evalRecord.braintrustExpId) {
    try {
      experimentData = await fetchExperimentResults(evalRecord.braintrustExpId);
    } catch (error) {
      console.error("Failed to fetch experiment results:", error);
    }
  }

  // Calculate pass rate
  const passRate = experimentData
    ? experimentData.rows.filter((row) => {
        if (!row.scores || Object.keys(row.scores).length === 0) return false;
        const avg =
          Object.values(row.scores).reduce((a, b) => a + b, 0) /
          Object.values(row.scores).length;
        return avg >= 0.5;
      }).length / experimentData.totalRows
    : 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/evals"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to evaluations
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{evalRecord.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {evalRecord.dataset?.name ?? "Unknown dataset"}
              <span className="mx-2">·</span>
              {evalRecord.startedAt?.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          <Badge
            variant="outline"
            className={`${
              evalRecord.status === "completed"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : evalRecord.status === "failed"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : evalRecord.status === "running"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {evalRecord.status === "running" && (
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
            )}
            {evalRecord.status.charAt(0).toUpperCase() + evalRecord.status.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Running state */}
      {evalRecord.status === "running" && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-blue-50 p-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
            <h3 className="text-lg font-medium">Evaluation in progress</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Refresh the page to check for updates
            </p>
          </CardContent>
        </Card>
      )}

      {/* Failed state */}
      {evalRecord.status === "failed" && results && (
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-rose-100 p-2">
                <XCircle className="h-5 w-5 text-rose-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-rose-900">Evaluation failed</h3>
                <p className="mt-1 text-sm text-rose-700">
                  {(results.error as string) ?? "An unknown error occurred"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed state with results */}
      {evalRecord.status === "completed" && experimentData && (
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Examples
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums">
                  {experimentData.totalRows}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Pass rate
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums">
                  {Math.round(passRate * 100)}%
                </p>
              </CardContent>
            </Card>

            {Object.entries(experimentData.avgScores).map(([name, score]) => (
              <Card key={name}>
                <CardContent className="p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {name}
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tabular-nums">
                      {Math.round(score * 100)}%
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        score >= 0.7
                          ? "bg-emerald-500"
                          : score >= 0.4
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      }`}
                      style={{ width: `${score * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Results table */}
          <Card>
            <div className="overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-6 border-b bg-muted/40 px-6 py-3">
                <div className="w-16 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Result
                </div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Input
                </div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Output
                </div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Expected
                </div>
                <div className="w-20 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Score
                </div>
              </div>

              {/* Table body */}
              <div>
                {experimentData.rows.map((row) => (
                  <EvalResultRow
                    key={row.id}
                    row={row}
                    experimentId={evalRecord.braintrustExpId!}
                  />
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Completed but no experiment data */}
      {evalRecord.status === "completed" && !experimentData && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-muted p-4">
              <XCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No results available</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The evaluation completed but results could not be loaded
            </p>
          </CardContent>
        </Card>
      )}

      {/* Footer metadata */}
      <div className="mt-8 flex items-center justify-between border-t pt-6">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Started {evalRecord.startedAt?.toLocaleString() ?? "—"}</span>
          </div>
          {evalRecord.completedAt && (
            <>
              <span>·</span>
              <span>Completed {evalRecord.completedAt.toLocaleString()}</span>
            </>
          )}
        </div>
        {evalRecord.braintrustExpId && (
          <code className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
            {evalRecord.braintrustExpId}
          </code>
        )}
      </div>
    </div>
  );
}
