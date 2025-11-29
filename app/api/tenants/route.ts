import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tenants, tenantMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const createTenantSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  modelProvider: z.enum(["openai", "anthropic", "google"]),
  modelName: z.string(),
  instructions: z.string().min(1),
  apiKey: z.string().min(1),
  userId: z.string(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = createTenantSchema.parse(body);

    // Verify user ID matches session
    if (data.userId !== session.user.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if slug already exists
    const existing = await db.query.tenants.findFirst({
      where: eq(tenants.slug, data.slug),
    });

    if (existing) {
      return NextResponse.json(
        { message: "A bot with this URL slug already exists" },
        { status: 400 }
      );
    }

    // Create tenant with API key based on provider
    const apiKeyField = {
      openai: { openaiApiKey: data.apiKey },
      anthropic: { anthropicApiKey: data.apiKey },
      google: { googleApiKey: data.apiKey },
    }[data.modelProvider];

    const [tenant] = await db
      .insert(tenants)
      .values({
        name: data.name,
        slug: data.slug,
        modelProvider: data.modelProvider,
        modelName: data.modelName,
        instructions: data.instructions,
        ...apiKeyField,
      })
      .returning();

    // Add user as owner
    await db.insert(tenantMembers).values({
      userId: data.userId,
      tenantId: tenant.id,
      role: "owner",
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    console.error("Error creating tenant:", error);
    
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

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const userTenants = await db.query.tenantMembers.findMany({
      where: eq(tenantMembers.userId, session.user.id),
      with: {
        tenant: true,
      },
    });

    return NextResponse.json(userTenants.map((tm) => tm.tenant));
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

