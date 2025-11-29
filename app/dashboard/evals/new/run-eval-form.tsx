"use client";

import { Loader2, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Dataset {
  id: string;
  name: string;
}

interface RunEvalFormProps {
  tenantId: string;
  datasets: Dataset[];
}

export function RunEvalForm({ tenantId, datasets }: RunEvalFormProps): React.JSX.Element {
  const [name, setName] = useState("");
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? "");
  const [isRunning, setIsRunning] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!datasetId) {
      toast({
        title: "Dataset required",
        description: "Please select a dataset to evaluate against",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);

    try {
      const response = await fetch("/api/evals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined, // Optional - only send if provided
          datasetId,
          tenantId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start evaluation");
      }

      const { eval: evalRecord } = await response.json();

      toast({
        title: "Evaluation started",
        description: "Your evaluation is running. You'll see results shortly.",
      });

      router.push(`/dashboard/evals/${evalRecord.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to start evaluation",
        variant: "destructive",
      });
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluation settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Experiment name (optional)</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., v1.2 instructions test"
            />
            <p className="text-xs text-muted-foreground">
              Optional name for this experiment. Braintrust will auto-generate if not
              provided.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataset">Dataset</Label>
            <Select value={datasetId} onValueChange={setDatasetId}>
              <SelectTrigger>
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
            <p className="text-xs text-muted-foreground">
              The dataset of examples to evaluate against
            </p>
          </div>

          <div className="rounded-md border bg-muted/50 p-4">
            <h4 className="mb-2 text-sm font-medium">What happens next</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Your bot will process each example in the dataset</li>
              <li>• Responses will be compared to expected outputs</li>
              <li>• Scores will be calculated using Factuality</li>
              <li>• Results will be logged to Braintrust for analysis</li>
            </ul>
          </div>

          <Button type="submit" disabled={isRunning} className="w-full">
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting evaluation...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run evaluation
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
