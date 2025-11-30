import { Sparkles } from "lucide-react";
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
    <div className="container px-6 py-16">
      <Card className="max-w-2xl border-dashed">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3 text-primary">
            <Sparkles className="h-6 w-6" />
            <p className="text-sm font-medium uppercase tracking-wider">Welcome</p>
          </div>
          <CardTitle className="text-3xl font-bold">Hi {userName}!</CardTitle>
          <CardDescription className="text-base">
            Create your first bot to start tracing conversations, uploading documents, and
            running evaluations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Customize instructions and API keys per customer</li>
            <li>• Upload markdown docs for instant retrieval</li>
            <li>• Trace every conversation via Braintrust</li>
          </ul>
          <Link href="/dashboard/settings/new">
            <Button size="lg" className="w-full">
              Create your first bot
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
