import { createOpenAI } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";

// Use a default OpenAI key for embeddings, or tenant's key
export async function getEmbedding(text: string, apiKey?: string): Promise<number[]> {
  const openai = createOpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY!,
  });

  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: text,
  });

  return embedding;
}

export async function getEmbeddings(texts: string[], apiKey?: string): Promise<number[][]> {
  const openai = createOpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY!,
  });

  const { embeddings } = await embedMany({
    model: openai.embedding("text-embedding-3-small"),
    values: texts,
  });

  return embeddings;
}

// Simple text chunking for documents
export function chunkText(text: string, maxChunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  
  let currentChunk = "";
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Keep some overlap
      const words = currentChunk.split(" ");
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      currentChunk = overlapWords.join(" ") + "\n\n" + paragraph;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

