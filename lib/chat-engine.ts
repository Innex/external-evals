import type { CoreMessage } from "ai";
import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import type { tenants } from "@/db/schema";
import { documentChunks, documents } from "@/db/schema";
import { getEmbedding } from "@/lib/ai/embeddings";
import { getModel } from "@/lib/ai/providers";
import { getWrappedAI, traced } from "@/lib/braintrust";

const { streamText, generateText } = getWrappedAI();

type Tenant = typeof tenants.$inferSelect;

interface ChatTurnOptions {
  tenant: Tenant;
  messages: CoreMessage[];
  sessionId?: string;
  spanName?: string;
}

interface Span {
  log: (payload: Record<string, unknown>) => Promise<void> | void;
}

async function getRelevantContext(
  tenantId: string,
  query: string,
  apiKey?: string,
): Promise<string> {
  if (!query) return "";

  try {
    const queryEmbedding = await getEmbedding(query, apiKey);
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    const similarChunks = await db
      .select({
        content: documentChunks.content,
        similarity: sql<number>`1 - (${documentChunks.embedding} <=> ${embeddingStr}::vector)`,
      })
      .from(documentChunks)
      .innerJoin(documents, eq(documentChunks.documentId, documents.id))
      .where(eq(documents.tenantId, tenantId))
      .orderBy(sql`${documentChunks.embedding} <=> ${embeddingStr}::vector`)
      .limit(3);

    return similarChunks
      .filter((chunk) => chunk.similarity > 0.5)
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

async function executeChatTurn<T>(
  options: ChatTurnOptions & {
    runner: (args: {
      model: ReturnType<typeof getModel>;
      systemPrompt: string;
      context: string;
      span: Span;
    }) => Promise<T>;
  },
): Promise<T> {
  const { tenant, messages, sessionId, spanName, runner } = options;

  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  const userInput =
    lastUserMessage && typeof lastUserMessage.content === "string"
      ? lastUserMessage.content
      : "";

  const spanMetadata = {
    sessionId: sessionId ?? `session-${tenant.id}-${Date.now()}`,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    modelProvider: tenant.modelProvider,
    modelName: tenant.modelName,
  };

  return traced(
    async (span) => {
      span.log({
        input: userInput,
        metadata: spanMetadata,
      });

      const context = await getRelevantContext(
        tenant.id,
        userInput,
        tenant.openaiApiKey ?? undefined,
      );

      const systemPrompt = buildSystemPrompt(
        tenant.instructions,
        context,
        tenant.welcomeMessage,
      );

      const model = getModel(tenant);
      const result = await runner({ model, systemPrompt, context, span });

      return result;
    },
    {
      name: spanName ?? "chat-turn",
    },
  );
}

export async function streamChatTurn(options: ChatTurnOptions) {
  const { tenant, messages } = options;

  return executeChatTurn({
    ...options,
    runner: async ({ model, systemPrompt, context, span }) => {
      return streamText({
        model,
        system: systemPrompt,
        messages,
        temperature: tenant.temperature,
        maxTokens: 1024,
        onFinish: async ({ text }) => {
          span.log({
            output: text,
            metadata: {
              hasContext: context.length > 0,
            },
          });
        },
      });
    },
  });
}

export async function completeChatTurn(options: ChatTurnOptions): Promise<string> {
  const { tenant, messages } = options;

  const result = await executeChatTurn({
    ...options,
    runner: async ({ model, systemPrompt, context, span }) => {
      const completion = await generateText({
        model,
        system: systemPrompt,
        messages,
        temperature: tenant.temperature,
        maxTokens: 1024,
      });

      span.log({
        output: completion.text,
        metadata: {
          hasContext: context.length > 0,
        },
      });

      return completion.text;
    },
  });

  return result;
}
