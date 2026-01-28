import { Redis } from "@upstash/redis";
import { type CoreMessage } from "ai";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { exportSpan, startSessionSpan } from "@/lib/braintrust";
import { streamChatTurn } from "@/lib/chat-engine";

/**
 * Upstash Redis client for session span storage.
 * Uses REST API which works well with Vercel serverless functions.
 *
 * Required env vars (auto-configured by Vercel when you add Upstash):
 *   - KV_REST_API_URL (or UPSTASH_REDIS_REST_URL)
 *   - KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_TOKEN)
 */
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Session span TTL in seconds (30 minutes - suitable for demos)
const SESSION_TTL_SECONDS = 30 * 60;

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

    // Get or create session-level parent span from Redis
    const cacheKey = `session-span:${sessionId}`;
    let parentSpan = await redis.get<string>(cacheKey);

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
          // Store in Redis with TTL
          await redis.set(cacheKey, exported, { ex: SESSION_TTL_SECONDS });
        }
      }
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
