import { currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { tenantMembers, traces } from "@/db/schema";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { expectedOutput?: unknown };
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
      where: and(
        eq(tenantMembers.userId, user.id),
        eq(tenantMembers.tenantId, trace.tenantId),
      ),
    });

    if (!member) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Update trace with annotation
    await db
      .update(traces)
      .set({
        expectedOutput,
        isAnnotated: true,
        annotatedAt: new Date(),
        annotatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(traces.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error annotating trace:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
