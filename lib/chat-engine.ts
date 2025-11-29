import type { CoreMessage } from "ai";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

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
  apiKey: string,
): Promise<string> {
  if (!query) return "";

  try {
    const queryEmbedding = await getEmbedding(query, apiKey);
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    const similarChunks = await db
      .select({
        content: documentChunks.content,
        similarity: sql<number>`1 - (${documentChunks.embedding} <=> ${embeddingStr}::vector)`,
        title: documents.title,
      })
      .from(documentChunks)
      .innerJoin(documents, eq(documentChunks.documentId, documents.id))
      .where(eq(documents.tenantId, tenantId))
      .orderBy(sql`${documentChunks.embedding} <=> ${embeddingStr}::vector`)
      .limit(5);

    const relevant = similarChunks.filter((chunk) => chunk.similarity > 0.45);

    if (relevant.length === 0) {
      return "";
    }

    const formatted = relevant
      .map(
        (chunk, idx) =>
          `Result ${idx + 1} — Source: ${chunk.title ?? "Untitled"}\nSimilarity: ${chunk.similarity.toFixed(3)}\n\n${chunk.content}`,
      )
      .join("\n\n-----\n\n");

    return formatted;
  } catch (error) {
    console.error("Error getting context:", error);
    return "";
  }
}

function buildSystemPrompt(
  instructions: string,
  hasKnowledgeTool: boolean,
  welcomeMessage: string,
): string {
  let prompt = instructions;

  if (hasKnowledgeTool) {
    prompt +=
      "\n\n## Knowledge Base Tool\nYou have access to a tool named `knowledgeBase`. When the user asks about product details, policies, troubleshooting steps, or anything that could be answered using uploaded documents, call this tool with a well-formed search query (usually the exact user question). The tool returns snippets from the knowledge base. Incorporate that information into your response, cite the source titles when possible, and if no relevant context is found, say so explicitly.";
  }

  prompt += `\n\n## Guidelines\n- Be helpful, friendly, and concise\n- If you don't know something, say so honestly\n- Your welcome message is: "${welcomeMessage}"`;

  return prompt;
}

async function executeChatTurn<T>(
  options: ChatTurnOptions & {
    runner: (args: {
      model: ReturnType<typeof getModel>;
      systemPrompt: string;
      tools: Record<string, unknown> | undefined;
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

      const embeddingKey = tenant.openaiApiKey ?? process.env.OPENAI_API_KEY;

      const tools =
        embeddingKey !== undefined
          ? {
              knowledgeBase: {
                description:
                  "Search the tenant's uploaded documents for factual context related to the question.",
                parameters: z.object({
                  query: z
                    .string()
                    .describe("A precise natural-language question to search for."),
                }),
                execute: async ({ query }: { query: string }) => {
                  const searchQuery = query.trim();
                  const context = await getRelevantContext(
                    tenant.id,
                    searchQuery,
                    embeddingKey,
                  );

                  if (!context) {
                    return "No relevant context found in the knowledge base.";
                  }

                  return context;
                },
              },
            }
          : undefined;

      const systemPrompt = buildSystemPrompt(
        tenant.instructions,
        Boolean(tools?.knowledgeBase),
        tenant.welcomeMessage,
      );

      const model = getModel(tenant);
      const result = await runner({ model, systemPrompt, tools, span });

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
    runner: async ({ model, systemPrompt, tools, span }) => {
      return streamText({
        model,
        system: systemPrompt,
        messages,
        tools,
        temperature: tenant.temperature,
        maxSteps: 5,
        experimental_toolCallStreaming: true,
        onFinish: async ({ text }: { text: string }) => {
          span.log({ output: text });
        },
      });
    },
  });
}

export async function completeChatTurn(options: ChatTurnOptions): Promise<string> {
  const { tenant, messages } = options;

  const result = await executeChatTurn({
    ...options,
    runner: async ({ model, systemPrompt, tools, span }) => {
      const completion = await generateText({
        model,
        system: systemPrompt,
        tools,
        messages,
        temperature: tenant.temperature,
        maxSteps: 5,
      });

      span.log({ output: completion.text });

      return completion.text;
    },
  });

  return result;
}
