import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { tenantMembers, tenants, users } from "@/db/schema";
import { getAvailableProviders } from "@/lib/ai/providers";

const createTenantSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  modelProvider: z.enum(["openai", "anthropic", "google"]),
  modelName: z.string(),
  instructions: z.string().min(1),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Ensure user exists in DB
    let dbUser = await db.query.users.findFirst({
      where: eq(users.id, clerkUser.id),
    });

    if (!dbUser) {
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (!email) {
        return NextResponse.json({ message: "User has no email" }, { status: 400 });
      }

      const [newUser] = await db
        .insert(users)
        .values({
          id: clerkUser.id,
          email,
          name: clerkUser.fullName ?? clerkUser.firstName ?? "User",
          image: clerkUser.imageUrl,
          emailVerified: new Date(),
        })
        .returning();

      dbUser = newUser;
    }

    const body: unknown = await request.json();
    const data = createTenantSchema.parse(body);

    // Check if slug already exists
    const existing = await db.query.tenants.findFirst({
      where: eq(tenants.slug, data.slug),
    });

    if (existing) {
      return NextResponse.json(
        { message: "A bot with this URL slug already exists" },
        { status: 400 },
      );
    }

    // Verify the selected provider is available (has API key configured)
    const availableProviders = getAvailableProviders();
    if (!availableProviders.includes(data.modelProvider)) {
      return NextResponse.json(
        { message: `Provider ${data.modelProvider} is not configured on this platform` },
        { status: 400 },
      );
    }

    const [tenant] = await db
      .insert(tenants)
      .values({
        name: data.name,
        slug: data.slug,
        modelProvider: data.modelProvider,
        modelName: data.modelName,
        instructions: data.instructions,
      })
      .returning();

    // Add user as owner
    await db.insert(tenantMembers).values({
      userId: dbUser.id,
      tenantId: tenant.id,
      role: "owner",
    });

    // Return tenant - client will redirect to /dashboard/[slug]
    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    console.error("Error creating tenant:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid data", errors: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function GET(): Promise<Response> {
  try {
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userTenants = await db.query.tenantMembers.findMany({
      where: eq(tenantMembers.userId, clerkUser.id),
      with: {
        tenant: true,
      },
    });

    return NextResponse.json(userTenants.map((tm) => tm.tenant));
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
