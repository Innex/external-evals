import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function OnboardingView({ userName }: { userName: string }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-16">
      <Card className="w-full max-w-lg border-dashed">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Welcome
            </p>
            <CardTitle className="text-2xl font-bold">Hi {userName}!</CardTitle>
            <CardDescription className="text-base">
              Create your first bot to start tracing conversations, uploading documents,
              and running evaluations.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              Customize instructions and API keys per customer
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              Upload markdown docs for instant retrieval
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              Trace every conversation via Braintrust
            </li>
          </ul>
          <Link href="/dashboard/settings/new" className="block">
            <Button size="lg" className="w-full gap-2">
              Create your first bot
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
