"use client";

import { ChevronDown, ChevronUp, Loader2, Pencil, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { DatasetRecord } from "@/lib/braintrust-dataset";
import { formatRelativeTime } from "@/lib/utils";

interface DatasetRecordCardProps {
  record: DatasetRecord;
  datasetId: string;
}

function formatInput(input: unknown): string {
  if (typeof input === "string") {
    return input;
  }
  if (Array.isArray(input)) {
    return input
      .map((msg: { role?: string; content?: string }) => {
        const role = msg.role === "user" ? "User" : "Assistant";
        return `${role}: ${msg.content ?? ""}`;
      })
      .join("\n\n");
  }
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}

function formatExpected(expected: unknown): string {
  if (typeof expected === "string") {
    return expected;
  }
  try {
    return JSON.stringify(expected, null, 2);
  } catch {
    return String(expected);
  }
}

export function DatasetRecordCard({
  record,
  datasetId,
}: DatasetRecordCardProps): React.JSX.Element {
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [isOutputExpanded, setIsOutputExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedExpected, setEditedExpected] = useState(formatExpected(record.expected));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  const inputText = formatInput(record.input);
  const expectedText = formatExpected(record.expected);

  const LINE_CLAMP = 3;
  const inputLineCount = inputText.split("\n").length;
  const expectedLineCount = expectedText.split("\n").length;
  const inputNeedsTruncation = inputLineCount > LINE_CLAMP || inputText.length > 200;
  const outputNeedsTruncation =
    expectedLineCount > LINE_CLAMP || expectedText.length > 200;

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/datasets/${datasetId}/records/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expected: editedExpected }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update record");
      }

      setIsEditing(false);
      router.refresh();
      toast({
        title: "Record updated",
        description: "The expected output has been saved",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update record",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!confirm("Are you sure you want to delete this example?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/datasets/${datasetId}/records/${record.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete record");
      }

      router.refresh();
      toast({
        title: "Record deleted",
        description: "The example has been removed from the dataset",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete record",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelEdit = (): void => {
    setEditedExpected(expectedText);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Session: {record.metadata.session_id.slice(0, 8)}…</span>
            <span>·</span>
            <span>{formatRelativeTime(new Date(record.created))}</span>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  <Pencil className="mr-1 h-3 w-3" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-destructive hover:text-destructive"
                >
                  {isDeleting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
            Input
          </p>
          <div
            className={`rounded-md bg-muted/50 p-3 text-sm ${isInputExpanded ? "" : "line-clamp-3"}`}
          >
            <pre className="whitespace-pre-wrap font-sans">{inputText}</pre>
          </div>
          {(inputNeedsTruncation || isInputExpanded) && (
            <button
              type="button"
              onClick={() => setIsInputExpanded(!isInputExpanded)}
              className="mt-1 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {isInputExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Show more
                </>
              )}
            </button>
          )}
        </div>

        <div>
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
            Expected output
          </p>
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editedExpected}
                onChange={(e) => setEditedExpected(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  <X className="mr-1 h-3 w-3" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="mr-1 h-3 w-3" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div
                className={`rounded-md border border-primary/20 bg-primary/5 p-3 text-sm ${isOutputExpanded ? "" : "line-clamp-3"}`}
              >
                <pre className="whitespace-pre-wrap font-sans">{expectedText}</pre>
              </div>
              {(outputNeedsTruncation || isOutputExpanded) && (
                <button
                  type="button"
                  onClick={() => setIsOutputExpanded(!isOutputExpanded)}
                  className="mt-1 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {isOutputExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Show more
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
