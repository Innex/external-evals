import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

import type { Tenant } from "@/db/schema";

export type ModelProvider = "openai" | "anthropic" | "google";

export function getAIProvider(tenant: Tenant) {
  const provider = tenant.modelProvider;

  switch (provider) {
    case "openai":
      if (!tenant.openaiApiKey) {
        throw new Error("OpenAI API key not configured");
      }
      return createOpenAI({
        apiKey: tenant.openaiApiKey,
      });

    case "anthropic":
      if (!tenant.anthropicApiKey) {
        throw new Error("Anthropic API key not configured");
      }
      return createAnthropic({
        apiKey: tenant.anthropicApiKey,
      });

    case "google":
      if (!tenant.googleApiKey) {
        throw new Error("Google API key not configured");
      }
      return createGoogleGenerativeAI({
        apiKey: tenant.googleApiKey,
      });

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export function getModel(tenant: Tenant) {
  const provider = getAIProvider(tenant);
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
