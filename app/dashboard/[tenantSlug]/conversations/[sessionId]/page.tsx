import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { ArrowLeft, Bot, User } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { datasets } from "@/db/schema";
import {
  type BraintrustTurn,
  fetchBraintrustTurns,
  formatTurnText,
  getTurnTimestamp,
} from "@/lib/braintrust-chat";
import { getTenantForUserOrThrow } from "@/lib/tenant-access";
import { formatRelativeTime } from "@/lib/utils";

import { SaveToDatasetDialog } from "./save-to-dataset-dialog";

interface ConversationDetailPageProps {
  params: Promise<{ tenantSlug: string; sessionId: string }>;
}

function buildConversationHistory(
  turns: BraintrustTurn[],
  upToIndex: number,
): { role: "user" | "assistant"; content: string }[] {
  const history: { role: "user" | "assistant"; content: string }[] = [];

  for (let i = 0; i <= upToIndex; i++) {
    const turn = turns[i];
    const userMsg = formatTurnText(turn.input);
    const botMsg = formatTurnText(turn.output);

    if (userMsg) {
      history.push({ role: "user", content: userMsg });
    }
    if (botMsg && i < upToIndex) {
      history.push({ role: "assistant", content: botMsg });
    }
  }

  return history;
}

export default async function ConversationDetailPage({
  params,
}: ConversationDetailPageProps): Promise<JSX.Element> {
  const { tenantSlug, sessionId } = await params;
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { tenant } = await getTenantForUserOrThrow(user.id, tenantSlug);

  const tenantDatasets = await db.query.datasets.findMany({
    where: eq(datasets.tenantId, tenant.id),
    orderBy: (ds, { desc }) => [desc(ds.createdAt)],
  });

  const allTurns = await fetchBraintrustTurns({ tenantId: tenant.id });
  const turns = allTurns
    .filter((t) => t.sessionId === sessionId)
    .sort((a, b) => getTurnTimestamp(a) - getTurnTimestamp(b));

  if (turns.length === 0) {
    notFound();
  }

  const firstTurn = turns[0];

  return (
    <div className="container space-y-6 px-6 py-8">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/${tenant.slug}/conversations`}
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
        {turns.map((turn, turnIndex) => {
          const userMessage = formatTurnText(turn.input);
          const botMessage = formatTurnText(turn.output);

          return (
            <div key={turn.id} className="space-y-3">
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

              {botMessage && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <Card className="flex-1 border-primary/20">
                    <CardContent className="py-3">
                      <p className="whitespace-pre-wrap text-sm">{botMessage}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {turn.modelProvider ?? "unknown"} · {turn.modelName ?? "n/a"}
                        </span>
                        <SaveToDatasetDialog
                          tenantId={tenant.id}
                          sessionId={sessionId}
                          turnId={turn.id}
                          conversationHistory={buildConversationHistory(turns, turnIndex)}
                          actualResponse={botMessage}
                          datasets={tenantDatasets.map((d) => ({
                            id: d.id,
                            name: d.name,
                          }))}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
