import { currentUser } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { FileText, Upload } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { getTenantForUserOrThrow } from "@/lib/tenant-access";
import { formatRelativeTime, truncate } from "@/lib/utils";

import { UploadDocumentDialog } from "../../documents/upload-document-dialog";

interface DocumentsPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function DocumentsPage({ params }: DocumentsPageProps) {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { tenantSlug } = await params;
  const { tenant } = await getTenantForUserOrThrow(user.id, tenantSlug);

  const allDocuments = await db.query.documents.findMany({
    where: eq(documents.tenantId, tenant.id),
    orderBy: [desc(documents.createdAt)],
    with: {
      chunks: true,
    },
  });

  return (
    <div className="container space-y-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Knowledge base</h1>
          <p className="text-muted-foreground">
            Upload documents to train your support bot
          </p>
        </div>
        <UploadDocumentDialog tenantId={tenant.id} />
      </div>

      {allDocuments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No documents yet</h3>
            <p className="mb-4 text-muted-foreground">
              Upload markdown documents to give your bot knowledge about your product.
            </p>
            <UploadDocumentDialog tenantId={tenant.id}>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload first document
              </Button>
            </UploadDocumentDialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allDocuments.map((doc) => (
            <Card key={doc.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-brand-500" />
                  {doc.title}
                </CardTitle>
                <CardDescription>
                  {doc.chunks.length} chunks • {formatRelativeTime(doc.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {truncate(doc.content, 200)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
