"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Clock,
  Zap,
  MessageSquare,
  Save,
  Database,
  CheckCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

interface TraceViewerProps {
  trace: {
    id: string;
    braintrustId: string | null;
    input: unknown;
    output: unknown;
    expectedOutput: unknown;
    modelProvider: string;
    modelName: string;
    promptTokens: number | null;
    completionTokens: number | null;
    latencyMs: number | null;
    metadata: unknown;
    isAnnotated: boolean;
    createdAt: Date;
    conversation: {
      messages: Array<{
        id: string;
        role: string;
        content: string;
        createdAt: Date;
      }>;
    } | null;
  };
}

export function TraceViewer({ trace }: TraceViewerProps) {
  const router = useRouter();
  const [expectedOutput, setExpectedOutput] = useState(
    trace.expectedOutput ? JSON.stringify(trace.expectedOutput, null, 2) : ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingToDataset, setIsSavingToDataset] = useState(false);

  const input = trace.input as { messages?: Array<{ content: string; role: string }>; context?: string };
  const output = trace.output as { text?: string } | null;

  const handleSaveAnnotation = async () => {
    setIsSaving(true);
    try {
      await fetch(`/api/traces/${trace.id}/annotate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedOutput: JSON.parse(expectedOutput) }),
      });
      router.refresh();
    } catch (error) {
      console.error("Error saving annotation:", error);
      alert("Failed to save annotation");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveToDataset = async () => {
    setIsSavingToDataset(true);
    try {
      await fetch(`/api/traces/${trace.id}/save-to-dataset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedOutput: JSON.parse(expectedOutput || "{}") }),
      });
      alert("Saved to dataset!");
    } catch (error) {
      console.error("Error saving to dataset:", error);
      alert("Failed to save to dataset");
    } finally {
      setIsSavingToDataset(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/traces">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Trace details</h1>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(trace.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {trace.isAnnotated && (
            <Badge variant="outline" className="text-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              Annotated
            </Badge>
          )}
          <Badge variant="secondary">{trace.modelName}</Badge>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="w-4 h-4" />
              Latency
            </div>
            <p className="text-2xl font-bold">{trace.latencyMs || 0}ms</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              Prompt tokens
            </div>
            <p className="text-2xl font-bold">{trace.promptTokens || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              Completion tokens
            </div>
            <p className="text-2xl font-bold">{trace.completionTokens || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              Total tokens
            </div>
            <p className="text-2xl font-bold">
              {(trace.promptTokens || 0) + (trace.completionTokens || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="io" className="w-full">
        <TabsList>
          <TabsTrigger value="io">Input / Output</TabsTrigger>
          <TabsTrigger value="conversation">Conversation</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="annotate">Annotate</TabsTrigger>
        </TabsList>

        <TabsContent value="io" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Input</CardTitle>
              <CardDescription>The messages sent to the model</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="p-4 rounded-lg bg-muted text-sm overflow-auto max-h-96">
                {JSON.stringify(input, null, 2)}
              </pre>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Output</CardTitle>
              <CardDescription>The model&apos;s response</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="p-4 rounded-lg bg-muted text-sm overflow-auto max-h-96 whitespace-pre-wrap">
                {output?.text || "No output"}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversation">
          <Card>
            <CardHeader>
              <CardTitle>Conversation history</CardTitle>
              <CardDescription>Full conversation from this session</CardDescription>
            </CardHeader>
            <CardContent>
              {trace.conversation?.messages ? (
                <div className="space-y-3">
                  {trace.conversation.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg ${
                        msg.role === "user" ? "bg-brand-500/10" : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={msg.role === "user" ? "default" : "secondary"}>
                          {msg.role}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No conversation history available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata">
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
              <CardDescription>Additional context and configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="p-4 rounded-lg bg-muted text-sm overflow-auto max-h-96">
                {JSON.stringify(trace.metadata, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="annotate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Annotate response</CardTitle>
              <CardDescription>
                Specify the expected output for evaluation. This helps train and improve your bot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Expected output (JSON)</Label>
                <Textarea
                  value={expectedOutput}
                  onChange={(e) => setExpectedOutput(e.target.value)}
                  placeholder='{"text": "The expected response..."}'
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveAnnotation} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save annotation
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSaveToDataset}
                  disabled={isSavingToDataset || !expectedOutput}
                >
                  {isSavingToDataset ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 mr-2" />
                      Save to dataset
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

