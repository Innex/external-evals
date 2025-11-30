import { currentUser } from "@clerk/nextjs/server";
import { count, eq } from "drizzle-orm";
import { AlertCircle, ArrowRight, FileText, MessageSquare, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db";
import { documents, users } from "@/db/schema";
import { getTenantForUserOrThrow } from "@/lib/tenant-access";

interface TenantDashboardPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function TenantDashboardPage({ params }: TenantDashboardPageProps) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    redirect("/sign-in");
  }

  const { tenantSlug } = await params;

  let dbUser = await db.query.users.findFirst({
    where: eq(users.id, clerkUser.id),
  });

  if (!dbUser) {
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) {
      throw new Error("User has no email address");
    }

    const [newUser] = await db
      .insert(users)
      .values({
        id: clerkUser.id,
        email,
        name: clerkUser.fullName ?? clerkUser.firstName ?? "User",
        image: clerkUser.imageUrl,
        emailVerified: new Date(),
      })
      .returning();

    dbUser = newUser;
  }

  const { tenant } = await getTenantForUserOrThrow(dbUser.id, tenantSlug);

  // Document count from Postgres
  const [documentCountResult] = await db
    .select({ count: count() })
    .from(documents)
    .where(eq(documents.tenantId, tenant.id));

  const documentCount = documentCountResult?.count ?? 0;

  // Note: Conversations and traces are stored in Braintrust, not Postgres.
  // We could fetch counts via BTQL here if needed, but for now we'll show
  // a simpler dashboard that links to the conversations page.

  const hasApiKey = tenant.openaiApiKey || tenant.anthropicApiKey || tenant.googleApiKey;

  return (
    <div className="container space-y-8 px-6 py-8">
      {!hasApiKey && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-400">
              API key required
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-500">
              Add your AI provider API key in{" "}
              <Link
                href={`/dashboard/${tenant.slug}/settings`}
                className="underline hover:no-underline"
              >
                settings
              </Link>{" "}
              to enable the chat widget.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{tenant.name}</h1>
          <p className="text-muted-foreground">Your AI support bot dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/widget/${tenant.slug}`} target="_blank">
            <Button variant="outline" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Preview widget
            </Button>
          </Link>
          <Link href={`/dashboard/${tenant.slug}/settings`}>
            <Button variant="outline">Configure</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="Conversations"
          description="View support conversations"
          icon={<MessageSquare className="h-5 w-5" />}
          href={`/dashboard/${tenant.slug}/conversations`}
        />
        <StatCard
          title="Documents"
          value={documentCount}
          description="Knowledge base articles"
          icon={<FileText className="h-5 w-5" />}
          href={`/dashboard/${tenant.slug}/documents`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <Card className="bg-muted/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-500" />
              Next steps
            </CardTitle>
            <CardDescription>Polish your bot experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ChecklistItem
              title="Upload product docs"
              description="Add markdown docs so the bot can answer real customer questions."
              href={`/dashboard/${tenant.slug}/documents`}
            />
            <ChecklistItem
              title="Review conversations"
              description="See how the bot is responding and annotate tricky cases."
              href={`/dashboard/${tenant.slug}/conversations`}
            />
            <ChecklistItem
              title="Run an evaluation"
              description="Save good/bad examples to a dataset and measure quality."
              href={`/dashboard/${tenant.slug}/evals`}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
  href,
}: {
  title: string;
  value?: number;
  description: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="rounded-full bg-muted p-3 text-muted-foreground">{icon}</div>
        </CardHeader>
        {value !== undefined && (
          <CardContent>
            <p className="text-3xl font-bold">{value}</p>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}

function ChecklistItem({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start justify-between rounded-lg border bg-background p-3 transition-colors hover:border-primary/50 hover:bg-background/80"
    >
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
