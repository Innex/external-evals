import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { db } from "@/db";
import { tenantMembers, traces } from "@/db/schema";

import { TraceViewer } from "./trace-viewer";

export default async function TraceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const userTenants = await db.query.tenantMembers.findMany({
    where: eq(tenantMembers.userId, user.id),
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
    <div className="container max-w-5xl px-6 py-8">
      <TraceViewer trace={trace} />
    </div>
  );
}
