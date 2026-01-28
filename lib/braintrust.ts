import * as ai from "ai";
import { initLogger, type Span, traced, updateSpan, wrapAISDK } from "braintrust";

// Re-export Span type for consumers
export type { Span };

// Initialize Braintrust logger with platform-level API key
let isInitialized = false;
let logger: ReturnType<typeof initLogger> | null = null;

function getLogger() {
  if (!process.env.BRAINTRUST_API_KEY) {
    return null;
  }

  if (!logger) {
    logger = initLogger({
      projectName: process.env.BRAINTRUST_PROJECT_NAME || "customer-support-platform",
      apiKey: process.env.BRAINTRUST_API_KEY,
    });
    isInitialized = true;
  }

  return logger;
}

export function initBraintrust(): void {
  if (isInitialized) return;
  getLogger();
}

// Wrap AI SDK functions for automatic tracing
export function getWrappedAI(): ReturnType<typeof wrapAISDK> {
  initBraintrust();
  return wrapAISDK(ai);
}

// Export traced function for custom spans
export { traced };

/**
 * Create a session-level root span for grouping all conversation turns.
 * Call this once when a new session starts (first message).
 *
 * @param sessionId - Unique identifier for the conversation session
 * @param metadata - Additional metadata to attach to the session span
 * @returns The root span, or null if Braintrust is not configured
 */
export function startSessionSpan(
  sessionId: string,
  metadata?: Record<string, unknown>,
): Span | null {
  const btLogger = getLogger();
  if (!btLogger) {
    return null;
  }

  return btLogger.startSpan({
    name: "conversation",
    event: {
      metadata: {
        sessionId,
        ...metadata,
      },
    },
  });
}

/**
 * Export a span to a string that can be stored and used as a parent for child spans.
 * This enables distributed/session-based tracing across multiple requests.
 *
 * @param span - The span to export
 * @returns Serialized span string, or null if span is null
 */
export async function exportSpan(span: Span | null): Promise<string | null> {
  if (!span) return null;
  return span.export();
}

/**
 * Update a session span with the latest input/output from a conversation turn.
 * This keeps the root "conversation" span populated with current values in the UI.
 *
 * @param exported - The exported span string (from exportSpan)
 * @param input - The latest user message
 * @param output - The latest assistant response
 */
export function updateSessionSpan(
  exported: string | undefined,
  input: string,
  output: string,
): void {
  if (!exported) return;
  initBraintrust();
  updateSpan({ exported, input, output });
}

// Helper to create tenant-specific metadata for traces
export function createTenantMetadata(
  tenantId: string,
  tenantSlug: string,
  additionalMetadata?: Record<string, unknown>,
): Record<string, unknown> {
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
  metadata?: Record<string, unknown>,
): Promise<{
  input: Record<string, unknown>;
  output: Record<string, unknown> | undefined;
  metadata: Record<string, unknown> | undefined;
}> {
  initBraintrust();

  return traced(
    async () => {
      return { input, output, metadata };
    },
    {
      name: eventName,
    },
  );
}
