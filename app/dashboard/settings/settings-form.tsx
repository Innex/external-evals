"use client";

import { AlertCircle, Loader2, Save } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Tenant } from "@/db/schema";

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

interface SettingsFormProps {
  tenant: Tenant;
}

export function SettingsForm({ tenant }: SettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null);

  // Basic settings
  const [name, setName] = useState(tenant.name);
  const [welcomeMessage, setWelcomeMessage] = useState(tenant.welcomeMessage);
  const [instructions, setInstructions] = useState(tenant.instructions);

  // AI settings
  const [modelProvider, setModelProvider] = useState<ModelProvider>(
    tenant.modelProvider as ModelProvider,
  );
  const [modelName, setModelName] = useState(tenant.modelName);
  const [temperature, setTemperature] = useState(tenant.temperature);

  // Fetch available providers on mount
  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch("/api/config/providers");
        if (response.ok) {
          const config = (await response.json()) as ProviderConfig;
          setProviderConfig(config);
        }
      } catch (error) {
        console.error("Failed to fetch provider config:", error);
      }
    }
    fetchConfig();
  }, []);

  // Visual settings
  const [primaryColor, setPrimaryColor] = useState(tenant.primaryColor);
  const [accentColor, setAccentColor] = useState(tenant.accentColor);

  // Widget settings
  const [widgetEnabled, setWidgetEnabled] = useState(tenant.widgetEnabled);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          welcomeMessage,
          instructions,
          modelProvider,
          modelName,
          temperature,
          primaryColor,
          accentColor,
          widgetEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      router.refresh();
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="ai">AI Model</TabsTrigger>
        <TabsTrigger value="widget">Widget</TabsTrigger>
        <TabsTrigger value="embed">Embed Code</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Basic settings</CardTitle>
            <CardDescription>Configure your bot&apos;s identity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Bot name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="welcomeMessage">Welcome message</Label>
              <Input
                id="welcomeMessage"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructions">System instructions</Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                These instructions are included in every conversation to guide the
                AI&apos;s behavior.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="ai" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>AI model configuration</CardTitle>
            <CardDescription>Choose your AI provider and model settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {providerConfig && !providerConfig.providers.includes(modelProvider) && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  The current provider ({PROVIDER_LABELS[modelProvider]}) is no longer
                  available. Please select a different provider.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Select
                  value={modelProvider}
                  onValueChange={(v) => {
                    const newProvider = v as ModelProvider;
                    setModelProvider(newProvider);
                    if (providerConfig?.modelOptions[newProvider]?.length) {
                      setModelName(providerConfig.modelOptions[newProvider][0].value);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providerConfig?.providers.map((provider) => (
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
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providerConfig?.modelOptions[modelProvider]?.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature: {temperature}</Label>
              <input
                type="range"
                id="temperature"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Lower values make responses more focused, higher values more creative.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="widget" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Widget settings</CardTitle>
            <CardDescription>Customize the chat widget appearance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="widgetEnabled">Widget enabled</Label>
                <p className="text-sm text-muted-foreground">
                  Allow the widget to be embedded on websites
                </p>
              </div>
              <Switch
                id="widgetEnabled"
                checked={widgetEnabled}
                onCheckedChange={setWidgetEnabled}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-12 p-1"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent color</Label>
                <div className="flex gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10 w-12 p-1"
                  />
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="embed" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Embed code</CardTitle>
            <CardDescription>
              Add this to your website to show the chat widget
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
              <code>{`<script 
  src="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/widget.js"
  data-tenant="${tenant.slug}"
  async
></script>`}</code>
            </pre>
            <p className="mt-3 text-xs text-muted-foreground">
              Paste this code before the closing {`</body>`} tag on your website.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save changes
            </>
          )}
        </Button>
      </div>
    </Tabs>
  );
}
