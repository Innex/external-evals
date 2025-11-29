"use client";

import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface UploadDocumentDialogProps {
  tenantId: string;
  children?: ReactNode;
}

export function UploadDocumentDialog({ tenantId, children }: UploadDocumentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFileError(null);

    try {
      const text = await file.text();
      setContent(text);

      if (!title) {
        const inferredTitle = file.name.replace(/\.[^/.]+$/, "");
        setTitle(inferredTitle);
      }
    } catch (error) {
      console.error("Failed to read file:", error);
      setFileError("Unable to read file. Please try again or paste the text manually.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, title, content }),
      });

      if (!response.ok) {
        throw new Error("Failed to upload document");
      }

      setTitle("");
      setContent("");
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error uploading document:", error);
      alert("Failed to upload document");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload document
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Upload document</DialogTitle>
            <DialogDescription>
              Add a markdown document to your knowledge base. The content will be
              automatically chunked and embedded for semantic search.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Getting Started Guide"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">Upload markdown file (optional)</Label>
              <Input
                id="file"
                type="file"
                accept=".md,.mdx,.markdown,.txt,.text"
                onChange={handleFileUpload}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                You can upload a markdown or text file. We'll automatically fill the
                content editor below so you can review it before saving.
              </p>
              {fileError && <p className="text-xs text-destructive">{fileError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content (Markdown)</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="# Welcome&#10;&#10;This guide covers..."
                rows={12}
                className="font-mono text-sm"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
