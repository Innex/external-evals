"use client";

import { CheckCircle2, ChevronDown, ChevronUp, XCircle } from "lucide-react";
import { useState } from "react";

interface EvalResultRowProps {
  row: {
    id: string;
    input: unknown;
    output: unknown;
    expected: unknown;
    scores: Record<string, number> | null;
  };
  experimentId: string;
}

function formatPreview(value: unknown, maxLength = 120): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") {
    return value.length > maxLength ? value.slice(0, maxLength) + "…" : value;
  }
  if (Array.isArray(value)) {
    const lastUserMsg = [...value]
      .reverse()
      .find((m) => (m as { role?: string }).role === "user") as
      | { role?: string; content?: string }
      | undefined;
    if (lastUserMsg?.content) {
      const content = lastUserMsg.content;
      return content.length > maxLength ? content.slice(0, maxLength) + "…" : content;
    }
  }
  const str = JSON.stringify(value);
  return str.length > maxLength ? str.slice(0, maxLength) + "…" : str;
}

function formatFull(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    // For conversation history, format nicely
    return value
      .map((m) => {
        const msg = m as { role?: string; content?: string };
        return `${msg.role?.toUpperCase() ?? "UNKNOWN"}: ${msg.content ?? ""}`;
      })
      .join("\n\n");
  }
  return JSON.stringify(value, null, 2);
}

function ScorePill({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const isGood = score >= 0.7;
  const isMedium = score >= 0.4 && score < 0.7;

  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${
        isGood
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
          : isMedium
            ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20"
            : "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20"
      }`}
    >
      {percentage}%
    </span>
  );
}

function StatusIcon({ passed }: { passed: boolean }) {
  return passed ? (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    </div>
  ) : (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-50">
      <XCircle className="h-4 w-4 text-rose-600" />
    </div>
  );
}

interface ExpandedData {
  input: unknown;
  output: unknown;
  expected: unknown;
}

export function EvalResultRow({
  row,
  experimentId,
}: EvalResultRowProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedData, setExpandedData] = useState<ExpandedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const hasScores = row.scores && Object.keys(row.scores).length > 0;
  const avgScore = hasScores
    ? Object.values(row.scores!).reduce((a, b) => a + b, 0) /
      Object.values(row.scores!).length
    : 0;
  const passed = avgScore >= 0.5;

  const handleToggle = async () => {
    if (isExpanded) {
      setIsExpanded(false);
      return;
    }

    setIsExpanded(true);

    // If we already have the data, don't fetch again
    if (expandedData) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/evals/experiment-row?experimentId=${encodeURIComponent(experimentId)}&rowId=${encodeURIComponent(row.id)}`,
      );
      if (response.ok) {
        const data = await response.json();
        setExpandedData(data);
      }
    } catch (error) {
      console.error("Failed to fetch expanded data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const displayData = expandedData ?? row;

  return (
    <div className="border-b last:border-b-0">
      {/* Collapsed row */}
      <button
        onClick={handleToggle}
        className="grid w-full grid-cols-[auto_1fr_1fr_1fr_auto] gap-6 px-6 py-4 text-left transition-colors hover:bg-muted/20"
      >
        <div className="flex w-16 items-center gap-2">
          <StatusIcon passed={passed} />
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {formatPreview(row.input)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm leading-relaxed">
            {formatPreview(row.output)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {formatPreview(row.expected)}
          </p>
        </div>
        <div className="flex w-20 items-center justify-end">
          {hasScores && <ScorePill score={avgScore} />}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t bg-muted/10 px-6 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading full content…
              </span>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Input */}
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Input
                </h4>
                <div className="rounded-lg border bg-background p-4">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                    {formatFull(displayData.input)}
                  </pre>
                </div>
              </div>

              {/* Output */}
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Output
                </h4>
                <div className="rounded-lg border bg-background p-4">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                    {formatFull(displayData.output)}
                  </pre>
                </div>
              </div>

              {/* Expected */}
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Expected
                </h4>
                <div className="rounded-lg border bg-background p-4">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                    {formatFull(displayData.expected)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Scores detail */}
          {hasScores && (
            <div className="mt-6 border-t pt-6">
              <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Scores
              </h4>
              <div className="flex flex-wrap gap-3">
                {Object.entries(row.scores!).map(([name, score]) => (
                  <div
                    key={name}
                    className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2"
                  >
                    <span className="text-sm font-medium">{name}</span>
                    <ScorePill score={score} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
