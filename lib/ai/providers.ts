import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

import type { Tenant } from "@/db/schema";

export type ModelProvider = "openai" | "anthropic" | "google";

/**
 * Get API key for a provider from environment variables.
 * API keys are platform-level, not per-tenant.
 */
export function getApiKeyForProvider(provider: ModelProvider): string | undefined {
  switch (provider) {
    case "openai":
      return process.env.OPENAI_API_KEY;
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY;
    case "google":
      return process.env.GOOGLE_API_KEY;
    default:
      return undefined;
  }
}

/**
 * Check which providers are available (have API keys configured).
 */
export function getAvailableProviders(): ModelProvider[] {
  const providers: ModelProvider[] = [];
  if (process.env.OPENAI_API_KEY) providers.push("openai");
  if (process.env.ANTHROPIC_API_KEY) providers.push("anthropic");
  if (process.env.GOOGLE_API_KEY) providers.push("google");
  return providers;
}

export function getAIProvider(provider: ModelProvider) {
  const apiKey = getApiKeyForProvider(provider);

  switch (provider) {
    case "openai":
      if (!apiKey) {
        throw new Error("OpenAI API key not configured. Set OPENAI_API_KEY env var.");
      }
      return createOpenAI({ apiKey });

    case "anthropic":
      if (!apiKey) {
        throw new Error(
          "Anthropic API key not configured. Set ANTHROPIC_API_KEY env var.",
        );
      }
      return createAnthropic({ apiKey });

    case "google":
      if (!apiKey) {
        throw new Error("Google API key not configured. Set GOOGLE_API_KEY env var.");
      }
      return createGoogleGenerativeAI({ apiKey });

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export function getModel(tenant: Pick<Tenant, "modelProvider" | "modelName">) {
  const provider = getAIProvider(tenant.modelProvider);
  return provider(tenant.modelName);
}

export const MODEL_OPTIONS = {
  openai: [
    { value: "gpt-5.1", label: "GPT-5.1" },
    { value: "gpt-5-mini", label: "GPT-5 Mini" },
    { value: "gpt-5-nano", label: "GPT-5 Nano" },
  ],
  anthropic: [
    { value: "claude-sonnet-4-5-20250514", label: "Claude Sonnet 4.5" },
    { value: "claude-4-5-haiku-20250514", label: "Claude 4.5 Haiku" },
    { value: "claude-4-5-opus-20250514", label: "Claude 4.5 Opus" },
  ],
  google: [
    { value: "gemini-3-pro", label: "Gemini 3 Pro" },
    { value: "gemini-3-flash", label: "Gemini 3 Flash" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  ],
} as const;

/**
 * Get model options filtered by available providers.
 */
export function getAvailableModelOptions() {
  const available = getAvailableProviders();
  const options: Record<string, readonly { value: string; label: string }[]> = {};
  for (const provider of available) {
    options[provider] = MODEL_OPTIONS[provider];
  }
  return options;
}
