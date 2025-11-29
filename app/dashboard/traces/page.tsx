import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { AlertCircle, BarChart3, Clock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { tenantMembers } from "@/db/schema";
import {
  type BraintrustTurn,
  fetchBraintrustTurns,
  formatTurnText,
} from "@/lib/braintrust-chat";
import { formatRelativeTime, truncate } from "@/lib/utils";

export default async function TracesPage(): Promise<JSX.Element> {
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

  let turns: BraintrustTurn[] = [];
  let braintrustError: string | null = null;

  try {
    turns = await fetchBraintrustTurns({ tenantId: activeTenant.id, limit: 100 });
  } catch (error) {
    console.error("Braintrust BTQL error:", error);
    braintrustError =
      error instanceof Error ? error.message : "Failed to query Braintrust.";
  }

  return (
    <div className="container space-y-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Traces</h1>
          <p className="text-muted-foreground">
            Streaming directly from Braintrust project logs.
          </p>
        </div>
        <Link href={`/widget/${activeTenant.slug}`} target="_blank">
          <Button variant="outline">Open widget</Button>
        </Link>
      </div>

      {braintrustError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex gap-3 py-4">
            <AlertCircle className="mt-1 h-4 w-4 text-destructive" />
            <div>
              <p className="font-medium text-destructive">
                Could not load Braintrust traces
              </p>
              <p className="text-sm text-muted-foreground">{braintrustError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!braintrustError && turns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No traces yet</h3>
            <p className="mb-4 text-muted-foreground">
              Start a conversation in the widget to see traces here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {turns.map((turn) => (
            <Card key={turn.id} className="transition-shadow hover:shadow-md">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant="secondary">
                        {turn.modelName ?? "Unknown model"}
                      </Badge>
                    </div>
                    <p className="mb-1 truncate text-sm font-medium">
                      {formatTurnText(turn.input) || "No user message"}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {turn.output
                        ? truncate(formatTurnText(turn.output), 120)
                        : "No response"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(new Date(turn.created))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
