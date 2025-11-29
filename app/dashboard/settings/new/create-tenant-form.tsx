"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { MODEL_OPTIONS } from "@/lib/ai/providers";
import { slugify } from "@/lib/utils";

interface CreateTenantFormProps {
  userId: string;
}

export function CreateTenantForm({ userId }: CreateTenantFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [modelProvider, setModelProvider] = useState<"openai" | "anthropic" | "google">(
    "openai",
  );
  const [modelName, setModelName] = useState("gpt-5-mini");
  const [instructions, setInstructions] = useState(
    "You are a helpful customer support assistant. Be friendly, concise, and helpful. If you don't know something, say so.",
  );
  const [apiKey, setApiKey] = useState("");

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(slugify(value));
  };

  const handleProviderChange = (value: "openai" | "anthropic" | "google") => {
    setModelProvider(value);
    setModelName(MODEL_OPTIONS[value][0].value);
    setApiKey("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          modelProvider,
          modelName,
          instructions,
          apiKey,
          userId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create bot");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Error creating tenant:", error);
      alert(error instanceof Error ? error.message : "Failed to create bot");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic information</CardTitle>
          <CardDescription>Give your support bot a name and identity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Bot name</Label>
            <Input
              id="name"
              placeholder="Acme Support"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL slug</Label>
            <Input
              id="slug"
              placeholder="acme-support"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Your widget will be available at /widget/{slug || "your-slug"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI configuration</CardTitle>
          <CardDescription>Choose your AI provider and model</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">AI provider</Label>
              <Select value={modelProvider} onValueChange={handleProviderChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="google">Google AI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select value={modelName} onValueChange={setModelName}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS[modelProvider].map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">
              {modelProvider === "openai" && "OpenAI API key"}
              {modelProvider === "anthropic" && "Anthropic API key"}
              {modelProvider === "google" && "Google AI API key"}
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder={
                modelProvider === "openai"
                  ? "sk-..."
                  : modelProvider === "anthropic"
                    ? "sk-ant-..."
                    : "AI..."
              }
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Your API key is stored securely and used only for your bot.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
          <CardDescription>
            Tell your bot how to behave. This will be included in every conversation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="You are a helpful assistant..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={6}
            required
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create bot"
          )}
        </Button>
      </div>
    </form>
  );
}
