import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { traces, tenantMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { expectedOutput } = body;

    // Get trace
    const trace = await db.query.traces.findFirst({
      where: eq(traces.id, id),
    });

    if (!trace) {
      return NextResponse.json({ message: "Trace not found" }, { status: 404 });
    }

    // Verify user has access to this tenant
    const member = await db.query.tenantMembers.findFirst({
      where: eq(tenantMembers.userId, session.user.id),
    });

    if (!member || member.tenantId !== trace.tenantId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Update trace with annotation
    await db
      .update(traces)
      .set({
        expectedOutput,
        isAnnotated: true,
        annotatedAt: new Date(),
        annotatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(traces.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error annotating trace:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

