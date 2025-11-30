"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
import { slugify } from "@/lib/utils";

type ModelProvider = "openai" | "anthropic" | "google";

interface ProviderConfig {
  providers: ModelProvider[];
  modelOptions: Record<string, { value: string; label: string }[]>;
}

const PROVIDER_LABELS: Record<ModelProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google AI",
};

export function CreateTenantForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [modelProvider, setModelProvider] = useState<ModelProvider | "">("");
  const [modelName, setModelName] = useState("");
  const [instructions, setInstructions] = useState(
    "You are a helpful customer support assistant. Be friendly, concise, and helpful. If you don't know something, say so.",
  );

  // Fetch available providers on mount
  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch("/api/config/providers");
        if (response.ok) {
          const config = (await response.json()) as ProviderConfig;
          setProviderConfig(config);

          // Set defaults if providers are available
          if (config.providers.length > 0) {
            const defaultProvider = config.providers[0];
            setModelProvider(defaultProvider);
            if (config.modelOptions[defaultProvider]?.length > 0) {
              setModelName(config.modelOptions[defaultProvider][0].value);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch provider config:", error);
      } finally {
        setIsLoadingConfig(false);
      }
    }
    fetchConfig();
  }, []);

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(slugify(value));
  };

  const handleProviderChange = (value: ModelProvider) => {
    setModelProvider(value);
    if (providerConfig?.modelOptions[value]?.length) {
      setModelName(providerConfig.modelOptions[value][0].value);
    }
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
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create bot");
      }

      const tenant = await response.json();
      router.push(`/dashboard/${tenant.slug}`);
      router.refresh();
    } catch (error) {
      console.error("Error creating tenant:", error);
      alert(error instanceof Error ? error.message : "Failed to create bot");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!providerConfig || providerConfig.providers.length === 0) {
    return (
      <Card className="border-amber-500/50">
        <CardContent className="flex items-start gap-3 py-6">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-400">
              No AI providers configured
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              The platform administrator needs to configure at least one AI provider API
              key (OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY) before you can
              create a bot.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
              <Select
                value={modelProvider}
                onValueChange={(v) => handleProviderChange(v as ModelProvider)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {providerConfig.providers.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {PROVIDER_LABELS[provider]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select value={modelName} onValueChange={setModelName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {modelProvider &&
                    providerConfig.modelOptions[modelProvider]?.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
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
        <Button type="submit" disabled={isLoading || !modelProvider || !modelName}>
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
