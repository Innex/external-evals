import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { ArrowLeft, Bot, User } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { tenantMembers } from "@/db/schema";
import {
  fetchBraintrustTurns,
  formatTurnText,
  getTurnTimestamp,
} from "@/lib/braintrust-chat";
import { formatRelativeTime } from "@/lib/utils";

interface ConversationDetailPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function ConversationDetailPage({
  params,
}: ConversationDetailPageProps): Promise<JSX.Element> {
  const { sessionId } = await params;
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const userTenants = await db.query.tenantMembers.findMany({
    where: eq(tenantMembers.userId, user.id),
    with: { tenant: true },
  });

  if (userTenants.length === 0) {
    notFound();
  }

  const activeTenant = userTenants[0].tenant;

  // Fetch all turns for this tenant and filter by sessionId
  const allTurns = await fetchBraintrustTurns({ tenantId: activeTenant.id });
  const turns = allTurns
    .filter((t) => t.sessionId === sessionId)
    .sort((a, b) => getTurnTimestamp(a) - getTurnTimestamp(b)); // oldest first

  if (turns.length === 0) {
    notFound();
  }

  const firstTurn = turns[0];

  return (
    <div className="container space-y-6 px-6 py-8">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/conversations"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to conversations
        </Link>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Conversation</h1>
          <Badge variant="outline">Session: {sessionId.slice(0, 8)}…</Badge>
        </div>
        <p className="text-muted-foreground">
          {turns.length} turn{turns.length === 1 ? "" : "s"} · Started{" "}
          {formatRelativeTime(new Date(firstTurn.created))}
        </p>
      </div>

      <div className="space-y-4">
        {turns.map((turn) => {
          const userMessage = formatTurnText(turn.input);
          const botMessage = formatTurnText(turn.output);

          return (
            <div key={turn.id} className="space-y-3">
              {/* User message */}
              {userMessage && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4" />
                  </div>
                  <Card className="flex-1">
                    <CardContent className="py-3">
                      <p className="whitespace-pre-wrap text-sm">{userMessage}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatRelativeTime(new Date(turn.created))}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Bot response */}
              {botMessage && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <Card className="flex-1 border-primary/20">
                    <CardContent className="py-3">
                      <p className="whitespace-pre-wrap text-sm">{botMessage}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {turn.modelProvider ?? "unknown"} · {turn.modelName ?? "n/a"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Link to view in Braintrust */}
      <div className="border-t pt-4">
        <p className="text-sm text-muted-foreground">
          View detailed traces for this conversation in{" "}
          <Link href="/dashboard/traces" className="text-primary hover:underline">
            Traces
          </Link>
        </p>
      </div>
    </div>
  );
}
