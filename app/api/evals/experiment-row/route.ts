import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { runBtqlObject } from "@/lib/braintrust-btql";

export async function GET(request: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const experimentId = searchParams.get("experimentId");
  const rowId = searchParams.get("rowId");

  if (!experimentId || !rowId) {
    return NextResponse.json({ error: "Missing experimentId or rowId" }, { status: 400 });
  }

  try {
    // Query for a single row with full content (preview_length: -1 means no truncation)
    const query = {
      select: [{ op: "star" as const }],
      from: {
        op: "function" as const,
        name: { op: "ident" as const, name: ["experiment"] },
        args: [{ op: "literal" as const, value: experimentId }],
        shape: "summary",
      },
      where: {
        op: "eq" as const,
        left: { op: "ident" as const, name: ["id"] },
        right: { op: "literal" as const, value: rowId },
      },
      preview_length: -1,
      limit: 1,
    };

    interface ExperimentRow {
      id: string;
      input: unknown;
      output: unknown;
      expected: unknown;
      scores: Record<string, number> | null;
    }

    const rows = await runBtqlObject<ExperimentRow>(query);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 });
    }

    const row = rows[0];
    return NextResponse.json({
      input: row.input,
      output: row.output,
      expected: row.expected,
    });
  } catch (error) {
    console.error("Failed to fetch experiment row:", error);
    return NextResponse.json({ error: "Failed to fetch row data" }, { status: 500 });
  }
}
