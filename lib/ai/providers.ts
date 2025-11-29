import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
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
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  anthropic: [
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
    { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
  ],
  google: [
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    { value: "gemini-pro", label: "Gemini Pro" },
  ],
} as const;

