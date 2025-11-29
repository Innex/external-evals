import { currentUser } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { BarChart3, CheckCircle, Clock, Zap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { tenantMembers, traces } from "@/db/schema";
import { formatRelativeTime, truncate } from "@/lib/utils";

export default async function TracesPage() {
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
        <p className="text-muted-foreground">Create a bot first to see traces.</p>
      </div>
    );
  }

  const activeTenant = userTenants[0].tenant;

  const allTraces = await db.query.traces.findMany({
    where: eq(traces.tenantId, activeTenant.id),
    orderBy: [desc(traces.createdAt)],
    limit: 50,
  });

  return (
    <div className="container space-y-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Traces</h1>
          <p className="text-muted-foreground">View and annotate AI interactions</p>
        </div>
      </div>

      {allTraces.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No traces yet</h3>
            <p className="mb-4 text-muted-foreground">
              Start a conversation in the widget to see traces here.
            </p>
            <Link href={`/widget/${activeTenant.slug}`} target="_blank">
              <Button>Open widget</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {allTraces.map((trace) => {
            const input = trace.input as {
              messages?: { content: string; role: string }[];
            };
            const output = trace.output as { text?: string } | null;
            const lastUserMessage = input.messages
              ?.filter((m) => m.role === "user")
              .pop();

            return (
              <Link key={trace.id} href={`/dashboard/traces/${trace.id}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant="secondary">{trace.modelName}</Badge>
                          {trace.isAnnotated && (
                            <Badge variant="outline" className="text-green-600">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Annotated
                            </Badge>
                          )}
                        </div>
                        <p className="mb-1 truncate text-sm font-medium">
                          {lastUserMessage?.content ?? "No user message"}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {output?.text ? truncate(output.text, 100) : "No response"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(trace.createdAt)}
                        </div>
                        {trace.latencyMs && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Zap className="h-3 w-3" />
                            {trace.latencyMs}ms
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
