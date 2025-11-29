import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tenants, tenantMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  welcomeMessage: z.string().optional(),
  instructions: z.string().optional(),
  modelProvider: z.enum(["openai", "anthropic", "google"]).optional(),
  modelName: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  widgetEnabled: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this tenant
    const member = await db.query.tenantMembers.findFirst({
      where: eq(tenantMembers.userId, session.user.id),
    });

    if (!member || member.tenantId !== id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = updateTenantSchema.parse(body);

    // Update tenant
    const [updated] = await db
      .update(tenants)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating tenant:", error);
    
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, id),
    });

    if (!tenant) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    // Verify user has access
    const member = await db.query.tenantMembers.findFirst({
      where: eq(tenantMembers.userId, session.user.id),
    });

    if (!member || member.tenantId !== id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("Error fetching tenant:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

