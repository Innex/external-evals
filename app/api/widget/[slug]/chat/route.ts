import { type CoreMessage } from "ai";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { exportSpan, startSessionSpan } from "@/lib/braintrust";
import { streamChatTurn } from "@/lib/chat-engine";

/**
 * In-memory cache for session spans.
 * Maps sessionId -> exported span string
 *
 * NOTE: For production with multiple server instances, use Redis or similar:
 *   const redis = new Redis(process.env.REDIS_URL);
 *   await redis.set(`session-span:${sessionId}`, exportedSpan, 'EX', 86400);
 *   const parentSpan = await redis.get(`session-span:${sessionId}`);
 */
const sessionSpanCache = new Map<string, string>();

// Clean up old sessions periodically (simple TTL implementation)
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const sessionTimestamps = new Map<string, number>();

function cleanupOldSessions() {
  const now = Date.now();
  for (const [sessionId, timestamp] of sessionTimestamps.entries()) {
    if (now - timestamp > SESSION_TTL_MS) {
      sessionSpanCache.delete(sessionId);
      sessionTimestamps.delete(sessionId);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupOldSessions, 60 * 60 * 1000);

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

    // Get or create session-level parent span
    let parentSpan = sessionSpanCache.get(sessionId);

    if (!parentSpan) {
      // First message in this session - create the root "conversation" span
      const rootSpan = startSessionSpan(sessionId, {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        modelProvider: tenant.modelProvider,
        modelName: tenant.modelName,
      });

      if (rootSpan) {
        const exported = await exportSpan(rootSpan);
        if (exported) {
          parentSpan = exported;
          sessionSpanCache.set(sessionId, exported);
          sessionTimestamps.set(sessionId, Date.now());
        }
      }
    } else {
      // Update timestamp to keep session alive
      sessionTimestamps.set(sessionId, Date.now());
    }

    const result = await streamChatTurn({
      tenant,
      messages: chatMessages,
      sessionId,
      spanName: "chat-turn",
      parentSpan: parentSpan ?? undefined,
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
