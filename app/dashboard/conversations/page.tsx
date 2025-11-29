import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tenantMembers, conversations, messages } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

export default async function ConversationsPage() {
  const session = await auth();
  
  const userTenants = await db.query.tenantMembers.findMany({
    where: eq(tenantMembers.userId, session!.user!.id!),
    with: { tenant: true },
  });

  if (userTenants.length === 0) {
    return (
      <div className="container py-8 px-6">
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
    <div className="container py-8 px-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Conversations</h1>
        <p className="text-muted-foreground">
          View all support conversations
        </p>
      </div>

      {allConversations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No conversations yet</h3>
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
              <Card key={conv.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">
                          Session: {conv.sessionId.slice(0, 8)}...
                        </Badge>
                      </div>
                      {lastMessage ? (
                        <p className="text-sm text-muted-foreground truncate">
                          <span className="font-medium">
                            {lastMessage.role === "user" ? "User" : "Bot"}:
                          </span>{" "}
                          {lastMessage.content.slice(0, 100)}...
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">No messages</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
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

