import { currentUser } from "@clerk/nextjs/server";
import { AlertCircle, ChevronRight, MessageSquare } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  type BraintrustTurn,
  fetchBraintrustTurns,
  formatTurnText,
  getTurnTimestamp,
} from "@/lib/braintrust-chat";
import { getTenantForUserOrThrow } from "@/lib/tenant-access";
import { formatRelativeTime } from "@/lib/utils";

interface ConversationSummary {
  sessionId: string;
  turnCount: number;
  lastTurn: BraintrustTurn;
}

interface ConversationsPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function ConversationsPage({
  params,
}: ConversationsPageProps): Promise<JSX.Element> {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { tenantSlug } = await params;
  const { tenant } = await getTenantForUserOrThrow(user.id, tenantSlug);

  let turns: BraintrustTurn[] = [];
  let braintrustError: string | null = null;

  try {
    turns = await fetchBraintrustTurns({ tenantId: tenant.id });
  } catch (error) {
    console.error("Braintrust BTQL error:", error);
    braintrustError =
      error instanceof Error ? error.message : "Failed to query Braintrust.";
  }

  const conversations = groupConversations(turns);

  return (
    <div className="container space-y-6 px-6 py-8">
      <div>
        <h1 className="text-3xl font-bold">Conversations</h1>
        <p className="text-muted-foreground">
          Live BTQL query against Braintrust project logs.
        </p>
      </div>

      {braintrustError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex gap-3 py-4">
            <AlertCircle className="mt-1 h-4 w-4 text-destructive" />
            <div>
              <p className="font-medium text-destructive">
                Could not load Braintrust conversations
              </p>
              <p className="text-sm text-muted-foreground">{braintrustError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!braintrustError && conversations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No conversations yet</h3>
            <p className="text-muted-foreground">
              Conversations will appear here when users interact with your widget.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation) => {
            const { lastTurn } = conversation;
            const lastResponse = formatTurnText(lastTurn.output);
            const lastQuestion = formatTurnText(lastTurn.input);

            return (
              <Link
                key={conversation.sessionId}
                href={`/dashboard/${tenant.slug}/conversations/${conversation.sessionId}`}
              >
                <Card className="cursor-pointer transition-shadow hover:border-primary/50 hover:shadow-md">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            Session: {conversation.sessionId.slice(0, 8)}…
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {conversation.turnCount} turn
                            {conversation.turnCount === 1 ? "" : "s"}
                          </span>
                        </div>
                        {lastQuestion && (
                          <p className="line-clamp-1 text-sm text-muted-foreground">
                            <span className="font-medium">User:</span> {lastQuestion}
                          </p>
                        )}
                        {lastResponse && (
                          <p className="line-clamp-2 text-sm">
                            <span className="font-medium">Bot:</span> {lastResponse}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Model: {lastTurn.modelProvider ?? "unknown"} ·{" "}
                          {lastTurn.modelName ?? "n/a"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-right">
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(new Date(lastTurn.created))}
                        </p>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
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

function groupConversations(turns: BraintrustTurn[]): ConversationSummary[] {
  const map = new Map<string, ConversationSummary>();

  for (const turn of turns) {
    const existing = map.get(turn.sessionId);
    if (!existing) {
      map.set(turn.sessionId, {
        sessionId: turn.sessionId,
        turnCount: 1,
        lastTurn: turn,
      });
      continue;
    }

    existing.turnCount += 1;
    if (getTurnTimestamp(turn) > getTurnTimestamp(existing.lastTurn)) {
      existing.lastTurn = turn;
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => getTurnTimestamp(b.lastTurn) - getTurnTimestamp(a.lastTurn),
  );
}
