import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tenantMembers, documents } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime, truncate } from "@/lib/utils";
import { FileText, Plus, Upload } from "lucide-react";
import { UploadDocumentDialog } from "./upload-document-dialog";

export default async function DocumentsPage() {
  const session = await auth();
  
  const userTenants = await db.query.tenantMembers.findMany({
    where: eq(tenantMembers.userId, session!.user!.id!),
    with: { tenant: true },
  });

  if (userTenants.length === 0) {
    return (
      <div className="container py-8 px-6">
        <p className="text-muted-foreground">Create a bot first to upload documents.</p>
      </div>
    );
  }

  const activeTenant = userTenants[0].tenant;

  const allDocuments = await db.query.documents.findMany({
    where: eq(documents.tenantId, activeTenant.id),
    orderBy: [desc(documents.createdAt)],
    with: {
      chunks: true,
    },
  });

  return (
    <div className="container py-8 px-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Knowledge base</h1>
          <p className="text-muted-foreground">
            Upload documents to train your support bot
          </p>
        </div>
        <UploadDocumentDialog tenantId={activeTenant.id} />
      </div>

      {allDocuments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No documents yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload markdown documents to give your bot knowledge about your product.
            </p>
            <UploadDocumentDialog tenantId={activeTenant.id}>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Upload first document
              </Button>
            </UploadDocumentDialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allDocuments.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand-500" />
                  {doc.title}
                </CardTitle>
                <CardDescription>
                  {doc.chunks.length} chunks • {formatRelativeTime(doc.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
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

