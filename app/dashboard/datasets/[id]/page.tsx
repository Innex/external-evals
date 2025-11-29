import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { AlertCircle, ArrowLeft, Database } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { datasets } from "@/db/schema";
import { fetchDatasetRecords } from "@/lib/braintrust-dataset";
import { formatRelativeTime } from "@/lib/utils";

import { DatasetRecordCard } from "./dataset-record-card";

interface DatasetDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DatasetDetailPage({
  params,
}: DatasetDetailPageProps): Promise<JSX.Element> {
  const { id: datasetId } = await params;
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Get the dataset
  const dataset = await db.query.datasets.findFirst({
    where: eq(datasets.id, datasetId),
  });

  if (!dataset) {
    notFound();
  }

  // Verify user has access to this tenant
  const membership = await db.query.tenantMembers.findFirst({
    where: (tm, { and, eq: equals }) =>
      and(equals(tm.userId, user.id), equals(tm.tenantId, dataset.tenantId)),
  });

  if (!membership) {
    notFound();
  }

  // Fetch records from Braintrust
  let records: Awaited<ReturnType<typeof fetchDatasetRecords>> = [];
  let fetchError: string | null = null;

  try {
    records = await fetchDatasetRecords({ datasetId });
  } catch (error) {
    console.error("Error fetching dataset records:", error);
    fetchError = error instanceof Error ? error.message : "Failed to fetch records";
  }

  return (
    <div className="container space-y-6 px-6 py-8">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/datasets"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to datasets
        </Link>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-brand-500" />
          <div>
            <h1 className="text-3xl font-bold">{dataset.name}</h1>
            <p className="text-muted-foreground">
              {dataset.description ?? "No description"} · Created{" "}
              {formatRelativeTime(dataset.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {fetchError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex gap-3 py-4">
            <AlertCircle className="mt-1 h-4 w-4 text-destructive" />
            <div>
              <p className="font-medium text-destructive">
                Could not load dataset records
              </p>
              <p className="text-sm text-muted-foreground">{fetchError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!fetchError && records.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Database className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No examples yet</h3>
            <p className="text-muted-foreground">
              Save examples from conversations to build this dataset.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {records.length} {records.length === 1 ? "example" : "examples"}
            </Badge>
          </div>

          <div className="space-y-4">
            {records.map((record) => (
              <DatasetRecordCard key={record.id} record={record} datasetId={datasetId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
