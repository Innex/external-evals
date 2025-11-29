import { initLogger, wrapAISDK, traced } from "braintrust";
import * as ai from "ai";

// Initialize Braintrust logger with platform-level API key
let isInitialized = false;

export function initBraintrust() {
  if (isInitialized) return;
  
  if (process.env.BRAINTRUST_API_KEY) {
    initLogger({
      projectName: process.env.BRAINTRUST_PROJECT_NAME || "customer-support-platform",
      apiKey: process.env.BRAINTRUST_API_KEY,
    });
    isInitialized = true;
  }
}

// Wrap AI SDK functions for automatic tracing
export function getWrappedAI() {
  initBraintrust();
  return wrapAISDK(ai);
}

// Export traced function for custom spans
export { traced };

// Helper to create tenant-specific metadata for traces
export function createTenantMetadata(tenantId: string, tenantSlug: string, additionalMetadata?: Record<string, unknown>) {
  return {
    tenantId,
    tenantSlug,
    ...additionalMetadata,
  };
}

// Helper to log custom events
export async function logEvent(
  eventName: string,
  input: Record<string, unknown>,
  output?: Record<string, unknown>,
  metadata?: Record<string, unknown>
) {
  initBraintrust();
  
  return traced(async () => {
    return { input, output, metadata };
  }, {
    name: eventName,
  })();
}

