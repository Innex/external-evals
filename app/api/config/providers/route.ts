import { NextResponse } from "next/server";

import { getAvailableProviders, MODEL_OPTIONS } from "@/lib/ai/providers";

export async function GET(): Promise<Response> {
  const availableProviders = getAvailableProviders();

  const modelOptions: Record<string, { value: string; label: string }[]> = {};
  for (const provider of availableProviders) {
    modelOptions[provider] = [...MODEL_OPTIONS[provider]];
  }

  return NextResponse.json({
    providers: availableProviders,
    modelOptions,
  });
}
