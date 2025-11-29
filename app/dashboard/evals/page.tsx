import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tenantMembers, evals, datasets } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime, formatDateTime } from "@/lib/utils";
import { FlaskConical, Play, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

export default async function EvalsPage() {
  const session = await auth();
  
  const userTenants = await db.query.tenantMembers.findMany({
    where: eq(tenantMembers.userId, session!.user!.id!),
    with: { tenant: true },
  });

  if (userTenants.length === 0) {
    return (
      <div className="container py-8 px-6">
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
    <div className="container py-8 px-6 space-y-6">
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
              <Play className="w-4 h-4 mr-2" />
              Run evaluation
            </Button>
          </Link>
        )}
      </div>

      {allEvals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FlaskConical className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No evaluations yet</h3>
            <p className="text-muted-foreground mb-4">
              {hasDatasets 
                ? "Run your first evaluation to measure your bot's performance."
                : "Create a dataset first by annotating traces, then run evaluations."}
            </p>
            {hasDatasets ? (
              <Link href="/dashboard/evals/new">
                <Button>
                  <Play className="w-4 h-4 mr-2" />
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
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
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
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(evalRun.createdAt)}
                      </p>
                    </div>
                  </div>
                  {evalRun.summary && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        {Object.entries(evalRun.summary as Record<string, number>).map(([key, value]) => (
                          <div key={key}>
                            <p className="text-muted-foreground capitalize">{key}</p>
                            <p className="font-medium">{typeof value === 'number' ? value.toFixed(2) : value}</p>
                          </div>
                        ))}
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
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    case "failed":
      return <XCircle className="w-6 h-6 text-red-500" />;
    case "running":
      return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
    default:
      return <Clock className="w-6 h-6 text-yellow-500" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    completed: "default",
    failed: "destructive",
    running: "secondary",
    pending: "outline",
  };

  return (
    <Badge variant={variants[status] || "outline"}>
      {status}
    </Badge>
  );
}

