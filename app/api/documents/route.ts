import { currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { documents, tenantMembers, tenants } from "@/db/schema";
import { chunkText, getEmbeddings } from "@/lib/ai/embeddings";

const createDocumentSchema = z.object({
  tenantId: z.string(),
  title: z.string().min(1).max(255),
  content: z.string().min(1),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const data = createDocumentSchema.parse(body);

    // Verify user has access to this tenant
    const member = await db.query.tenantMembers.findFirst({
      where: and(
        eq(tenantMembers.userId, user.id),
        eq(tenantMembers.tenantId, data.tenantId),
      ),
    });

    if (!member) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get tenant for API key
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, data.tenantId),
    });

    // Create document
    const [document] = await db
      .insert(documents)
      .values({
        tenantId: data.tenantId,
        title: data.title,
        content: data.content,
      })
      .returning();

    // Chunk the content
    const chunks = chunkText(data.content);

    // Generate embeddings for all chunks
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          message:
            "Missing OpenAI API key. Set OPENAI_API_KEY in your environment (or configure a tenant-level key) to enable document embeddings.",
        },
        { status: 400 },
      );
    }

    const embeddings = await getEmbeddings(chunks, apiKey);

    // Create chunks with embeddings
    for (let i = 0; i < chunks.length; i++) {
      const escapedContent = chunks[i].replace(/'/g, "''");
      await db.execute(`
        INSERT INTO document_chunks (id, document_id, content, embedding, chunk_index, created_at)
        VALUES (
          gen_random_uuid()::text,
          '${document.id}',
          '${escapedContent}',
          '[${embeddings[i].join(",")}]'::vector,
          ${i},
          NOW()
        )
      `);
    }

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid data", errors: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
