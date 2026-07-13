import { Redis } from "@upstash/redis";
import { type CoreMessage } from "ai";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { exportSpan, startSessionSpan } from "@/lib/braintrust";
import { streamChatTurn } from "@/lib/chat-engine";

// Session span TTL in seconds (30 minutes - suitable for demos)
const SESSION_TTL_SECONDS = 30 * 60;
const localSessionSpans = new Map<string, { exported: string; expiresAt: number }>();
let redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redis !== undefined) {
    return redis;
  }

  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

async function getCachedSessionSpan(cacheKey: string): Promise<string | null> {
  const redisClient = getRedis();
  if (redisClient) {
    try {
      return await redisClient.get<string>(cacheKey);
    } catch (error) {
      console.warn("Redis session cache read failed; using local cache", error);
    }
  }

  const cached = localSessionSpans.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    localSessionSpans.delete(cacheKey);
    return null;
  }

  return cached.exported;
}

async function cacheSessionSpan(cacheKey: string, exported: string): Promise<void> {
  const redisClient = getRedis();
  if (redisClient) {
    try {
      await redisClient.set(cacheKey, exported, { ex: SESSION_TTL_SECONDS });
      return;
    } catch (error) {
      console.warn("Redis session cache write failed; using local cache", error);
    }
  }

  localSessionSpans.set(cacheKey, {
    exported,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  });
}

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

    // Get or create session-level parent span from Redis, falling back to
    // per-instance memory when no Redis store is configured.
    const cacheKey = `session-span:${sessionId}`;
    let parentSpan = await getCachedSessionSpan(cacheKey);

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
          await cacheSessionSpan(cacheKey, exported);
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
