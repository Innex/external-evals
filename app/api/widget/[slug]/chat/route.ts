import { type CoreMessage } from "ai";
import * as ai from "ai";
import { initLogger, traced, wrapAISDK } from "braintrust";
import { and, eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { db } from "@/db";
import {
  conversations,
  documentChunks,
  documents,
  messages,
  tenants,
  traces,
} from "@/db/schema";
import { getEmbedding } from "@/lib/ai/embeddings";
import { getModel } from "@/lib/ai/providers";

// Initialize Braintrust
if (process.env.BRAINTRUST_API_KEY) {
  initLogger({
    projectName: process.env.BRAINTRUST_PROJECT_NAME || "customer-support-platform",
    apiKey: process.env.BRAINTRUST_API_KEY,
  });
}

// Wrap AI SDK for automatic tracing
const { streamText } = wrapAISDK(ai);

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

    // Get or create conversation
    let conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.tenantId, tenant.id),
        eq(conversations.sessionId, sessionId),
      ),
    });

    if (!conversation) {
      [conversation] = await db
        .insert(conversations)
        .values({
          tenantId: tenant.id,
          sessionId,
        })
        .returning();
    }

    // Get the last user message
    const lastUserMessage = chatMessages.filter((m) => m.role === "user").pop();
    const userInput =
      lastUserMessage && typeof lastUserMessage.content === "string"
        ? lastUserMessage.content
        : "";

    // Use traced() to wrap the entire chat turn
    const result = await traced(
      async (span) => {
        // Log input and metadata at the start
        span.log({
          input: userInput,
          metadata: {
            sessionId,
            conversationId: conversation.id,
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            modelProvider: tenant.modelProvider,
            modelName: tenant.modelName,
          },
        });

        // Retrieve relevant context from documents
        let context = "";
        if (userInput) {
          context = await getRelevantContext(
            tenant.id,
            userInput,
            tenant.openaiApiKey ?? undefined,
          );
        }

        // Build system prompt
        const systemPrompt = buildSystemPrompt(
          tenant.instructions,
          context,
          tenant.welcomeMessage,
        );

        // Get the AI model
        const model = getModel(tenant);

        // Track start time
        const startTime = Date.now();

        // Create the stream (wrapAISDK automatically traces this as a nested span)
        const streamResult = streamText({
          model,
          system: systemPrompt,
          messages: chatMessages,
          temperature: tenant.temperature,
          maxTokens: 1024,
          onFinish: async ({ text, usage }) => {
            const latencyMs = Date.now() - startTime;

            // Save user message
            if (userInput) {
              await db.insert(messages).values({
                conversationId: conversation.id,
                role: "user",
                content: userInput,
              });
            }

            // Create trace record (handle NaN/undefined token counts)
            const promptTokens = usage?.promptTokens;
            const completionTokens = usage?.completionTokens;

            const [trace] = await db
              .insert(traces)
              .values({
                tenantId: tenant.id,
                conversationId: conversation.id,
                modelProvider: tenant.modelProvider,
                modelName: tenant.modelName,
                input: { message: userInput, context },
                output: { text },
                promptTokens:
                  typeof promptTokens === "number" && !Number.isNaN(promptTokens)
                    ? promptTokens
                    : null,
                completionTokens:
                  typeof completionTokens === "number" && !Number.isNaN(completionTokens)
                    ? completionTokens
                    : null,
                latencyMs:
                  typeof latencyMs === "number" && !Number.isNaN(latencyMs)
                    ? latencyMs
                    : null,
                metadata: {
                  sessionId,
                  conversationId: conversation.id,
                  messageCount: chatMessages.length,
                },
              })
              .returning();

            // Save assistant message
            await db.insert(messages).values({
              conversationId: conversation.id,
              role: "assistant",
              content: text,
              traceId: trace.id,
            });

            // Log output to the span
            span.log({
              output: text,
              metadata: {
                hasContext: context.length > 0,
              },
            });
          },
        });

        return streamResult;
      },
      {
        name: "chat-turn",
      },
    );

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

async function getRelevantContext(
  tenantId: string,
  query: string,
  apiKey?: string,
): Promise<string> {
  try {
    // Get query embedding
    const queryEmbedding = await getEmbedding(query, apiKey);
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    // Find similar chunks using pgvector
    const similarChunks = await db
      .select({
        content: documentChunks.content,
        documentId: documentChunks.documentId,
        similarity: sql<number>`1 - (${documentChunks.embedding} <=> ${embeddingStr}::vector)`,
      })
      .from(documentChunks)
      .innerJoin(documents, eq(documentChunks.documentId, documents.id))
      .where(eq(documents.tenantId, tenantId))
      .orderBy(sql`${documentChunks.embedding} <=> ${embeddingStr}::vector`)
      .limit(3);

    if (similarChunks.length === 0) {
      return "";
    }

    // Format context
    return similarChunks
      .filter((chunk) => chunk.similarity > 0.5) // Only include relevant chunks
      .map((chunk) => chunk.content)
      .join("\n\n---\n\n");
  } catch (error) {
    console.error("Error getting context:", error);
    return "";
  }
}

function buildSystemPrompt(
  instructions: string,
  context: string,
  welcomeMessage: string,
): string {
  let prompt = instructions;

  if (context) {
    prompt += `\n\n## Relevant Context from Knowledge Base\n\nUse the following information to help answer the user's question:\n\n${context}\n\n---\n\nIf the context doesn't contain relevant information, you can still try to help based on your general knowledge, but let the user know if you're not certain.`;
  }

  prompt += `\n\n## Guidelines\n- Be helpful, friendly, and concise\n- If you don't know something, say so honestly\n- Your welcome message is: "${welcomeMessage}"`;

  return prompt;
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
