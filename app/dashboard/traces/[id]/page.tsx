import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tenantMembers, traces } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { TraceViewer } from "./trace-viewer";

export default async function TraceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const userTenants = await db.query.tenantMembers.findMany({
    where: eq(tenantMembers.userId, session!.user!.id!),
    with: { tenant: true },
  });

  if (userTenants.length === 0) {
    notFound();
  }

  const tenantIds = userTenants.map((t) => t.tenant.id);

  const trace = await db.query.traces.findFirst({
    where: eq(traces.id, id),
    with: {
      conversation: {
        with: {
          messages: true,
        },
      },
    },
  });

  if (!trace || !tenantIds.includes(trace.tenantId)) {
    notFound();
  }

  return (
    <div className="container py-8 px-6 max-w-5xl">
      <TraceViewer trace={trace} />
    </div>
  );
}

