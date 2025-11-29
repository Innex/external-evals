import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { documents, documentChunks, tenantMembers, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { chunkText, getEmbeddings } from "@/lib/ai/embeddings";

const createDocumentSchema = z.object({
  tenantId: z.string(),
  title: z.string().min(1).max(255),
  content: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = createDocumentSchema.parse(body);

    // Verify user has access to this tenant
    const member = await db.query.tenantMembers.findFirst({
      where: eq(tenantMembers.userId, session.user.id),
    });

    if (!member || member.tenantId !== data.tenantId) {
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
    const apiKey = tenant?.openaiApiKey || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      // Still create chunks without embeddings
      for (let i = 0; i < chunks.length; i++) {
        await db.insert(documentChunks).values({
          documentId: document.id,
          content: chunks[i],
          chunkIndex: i,
        });
      }
    } else {
      const embeddings = await getEmbeddings(chunks, apiKey);

      // Create chunks with embeddings
      for (let i = 0; i < chunks.length; i++) {
        await db.execute(`
          INSERT INTO document_chunks (id, document_id, content, embedding, chunk_index, created_at)
          VALUES (
            gen_random_uuid()::text,
            '${document.id}',
            $1,
            '[${embeddings[i].join(",")}]'::vector,
            ${i},
            NOW()
          )
        `.replace('$1', `'${chunks[i].replace(/'/g, "''")}'`));
      }
    }

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid data", errors: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

