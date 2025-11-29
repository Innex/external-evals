import { type CoreMessage } from "ai";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { streamChatTurn } from "@/lib/chat-engine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;

  try {
    const body = (await request.json()) as {
      messages: CoreMessage[];
      sessionId: string;
    };
    const { messages: chatMessages, sessionId } = body;

    // Get tenant
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    });

    if (!tenant) {
      return new Response("Tenant not found", { status: 404 });
    }

    if (!tenant.widgetEnabled) {
      return new Response("Widget is disabled", { status: 403 });
    }

    const result = await streamChatTurn({
      tenant,
      messages: chatMessages,
      sessionId,
      spanName: "chat-turn",
    });

    // Return streaming response
    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: "Failed to process chat" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Handle OPTIONS for CORS
export function OPTIONS(): Response {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
