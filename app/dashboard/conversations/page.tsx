import { currentUser } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { MessageSquare } from "lucide-react";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { conversations, messages, tenantMembers } from "@/db/schema";
import { formatRelativeTime } from "@/lib/utils";

export default async function ConversationsPage() {
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
        <p className="text-muted-foreground">Create a bot first to see conversations.</p>
      </div>
    );
  }

  const activeTenant = userTenants[0].tenant;

  const allConversations = await db.query.conversations.findMany({
    where: eq(conversations.tenantId, activeTenant.id),
    orderBy: [desc(conversations.updatedAt)],
    with: {
      messages: {
        orderBy: [desc(messages.createdAt)],
        limit: 1,
      },
    },
    limit: 50,
  });

  return (
    <div className="container space-y-6 px-6 py-8">
      <div>
        <h1 className="text-3xl font-bold">Conversations</h1>
        <p className="text-muted-foreground">View all support conversations</p>
      </div>

      {allConversations.length === 0 ? (
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
          {allConversations.map((conv) => {
            const lastMessage = conv.messages[0];

            return (
              <Card key={conv.id} className="transition-shadow hover:shadow-md">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="secondary">
                          Session: {conv.sessionId.slice(0, 8)}...
                        </Badge>
                      </div>
                      {lastMessage ? (
                        <p className="truncate text-sm text-muted-foreground">
                          <span className="font-medium">
                            {lastMessage.role === "user" ? "User" : "Bot"}:
                          </span>{" "}
                          {lastMessage.content.slice(0, 100)}...
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">No messages</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(conv.updatedAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
