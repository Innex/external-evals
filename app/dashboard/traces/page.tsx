import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tenantMembers, traces } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime, truncate } from "@/lib/utils";
import { BarChart3, CheckCircle, Clock, Zap } from "lucide-react";

export default async function TracesPage() {
  const session = await auth();
  
  const userTenants = await db.query.tenantMembers.findMany({
    where: eq(tenantMembers.userId, session!.user!.id!),
    with: { tenant: true },
  });

  if (userTenants.length === 0) {
    return (
      <div className="container py-8 px-6">
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
    <div className="container py-8 px-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Traces</h1>
          <p className="text-muted-foreground">
            View and annotate AI interactions
          </p>
        </div>
      </div>

      {allTraces.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No traces yet</h3>
            <p className="text-muted-foreground mb-4">
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
            const input = trace.input as { messages?: Array<{ content: string; role: string }> };
            const output = trace.output as { text?: string } | null;
            const lastUserMessage = input.messages?.filter((m) => m.role === "user").pop();
            
            return (
              <Link key={trace.id} href={`/dashboard/traces/${trace.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">{trace.modelName}</Badge>
                          {trace.isAnnotated && (
                            <Badge variant="outline" className="text-green-600">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Annotated
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium mb-1 truncate">
                          {lastUserMessage?.content || "No user message"}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {output?.text ? truncate(output.text, 100) : "No response"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(trace.createdAt)}
                        </div>
                        {trace.latencyMs && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Zap className="w-3 h-3" />
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

