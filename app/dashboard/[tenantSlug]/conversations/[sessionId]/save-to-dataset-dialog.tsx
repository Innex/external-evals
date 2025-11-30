"use client";

import { Loader2, Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Dataset {
  id: string;
  name: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface SaveToDatasetDialogProps {
  tenantId: string;
  sessionId: string;
  turnId: string;
  conversationHistory: Message[];
  actualResponse: string;
  datasets: Dataset[];
}

export function SaveToDatasetDialog({
  tenantId,
  sessionId,
  turnId,
  conversationHistory,
  actualResponse,
  datasets,
}: SaveToDatasetDialogProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [newDatasetName, setNewDatasetName] = useState("");
  const [expectedOutput, setExpectedOutput] = useState(actualResponse);
  const [isCreatingDataset, setIsCreatingDataset] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewDatasetForm, setShowNewDatasetForm] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  const handleCreateDataset = async (): Promise<void> => {
    if (!newDatasetName.trim()) return;

    setIsCreatingDataset(true);
    try {
      const response = await fetch("/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDatasetName.trim(),
          tenantId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create dataset");
      }

      const { dataset } = await response.json();
      setSelectedDatasetId(dataset.id);
      setNewDatasetName("");
      setShowNewDatasetForm(false);
      router.refresh();

      toast({
        title: "Dataset created",
        description: `Created dataset "${dataset.name}"`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create dataset",
        variant: "destructive",
      });
    } finally {
      setIsCreatingDataset(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!selectedDatasetId) {
      toast({
        title: "Select a dataset",
        description: "Please select or create a dataset first",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/datasets/${selectedDatasetId}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          turnId,
          input: conversationHistory,
          expected: expectedOutput,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save to dataset");
      }

      setOpen(false);
      toast({
        title: "Saved to dataset",
        description: "The example has been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save to dataset",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Save className="h-4 w-4" />
          Save to dataset
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Save to dataset</DialogTitle>
          <DialogDescription>
            Save this conversation turn as a training example. You can edit the expected
            response below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Dataset</Label>
            {showNewDatasetForm ? (
              <div className="flex gap-2">
                <Input
                  placeholder="New dataset name"
                  value={newDatasetName}
                  onChange={(e) => setNewDatasetName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateDataset();
                    }
                  }}
                />
                <Button
                  onClick={handleCreateDataset}
                  disabled={!newDatasetName.trim() || isCreatingDataset}
                >
                  {isCreatingDataset ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
                <Button variant="ghost" onClick={() => setShowNewDatasetForm(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={selectedDatasetId} onValueChange={setSelectedDatasetId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets.map((ds) => (
                      <SelectItem key={ds.id} value={ds.id}>
                        {ds.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => setShowNewDatasetForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Input (conversation history)</Label>
            <div className="max-h-40 overflow-y-auto rounded-md border bg-muted/50 p-3">
              {conversationHistory.map((msg, i) => (
                <div key={i} className="mb-2 last:mb-0">
                  <span className="font-medium">
                    {msg.role === "user" ? "User: " : "Assistant: "}
                  </span>
                  <span className="text-muted-foreground">{msg.content}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected">Expected response</Label>
            <Textarea
              id="expected"
              value={expectedOutput}
              onChange={(e) => setExpectedOutput(e.target.value)}
              rows={6}
              placeholder="What should the assistant have said?"
            />
            <p className="text-xs text-muted-foreground">
              Edit this to specify what the correct response should be
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !selectedDatasetId}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save example
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
