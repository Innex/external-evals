import { currentUser } from "@clerk/nextjs/server";
import { count, desc, eq } from "drizzle-orm";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  FileText,
  MessageSquare,
  Plus,
  Sparkles,
} from "lucide-react";
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
import { conversations, documents, tenantMembers, traces, users } from "@/db/schema";

export default async function DashboardPage() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect("/sign-in");
  }

  // Ensure user exists in our database
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

  // Get user's tenants
  const userTenants = await db.query.tenantMembers.findMany({
    where: eq(tenantMembers.userId, dbUser.id),
    with: {
      tenant: true,
    },
  });

  // If no tenants, show onboarding
  if (userTenants.length === 0) {
    return <OnboardingView userName={dbUser.name ?? "there"} />;
  }

  // Get the first/active tenant
  const activeTenant = userTenants[0].tenant;

  // Get real counts from the database
  const [conversationCountResult] = await db
    .select({ count: count() })
    .from(conversations)
    .where(eq(conversations.tenantId, activeTenant.id));

  const [traceCountResult] = await db
    .select({ count: count() })
    .from(traces)
    .where(eq(traces.tenantId, activeTenant.id));

  const [documentCountResult] = await db
    .select({ count: count() })
    .from(documents)
    .where(eq(documents.tenantId, activeTenant.id));

  const conversationCount = conversationCountResult?.count ?? 0;
  const traceCount = traceCountResult?.count ?? 0;
  const documentCount = documentCountResult?.count ?? 0;

  // Get recent traces
  const recentTraces = await db.query.traces.findMany({
    where: eq(traces.tenantId, activeTenant.id),
    orderBy: [desc(traces.createdAt)],
    limit: 5,
  });

  // Check if API key is configured
  const hasApiKey =
    activeTenant.openaiApiKey ||
    activeTenant.anthropicApiKey ||
    activeTenant.googleApiKey;

  return (
    <div className="container space-y-8 px-6 py-8">
      {/* Show warning if no API key configured */}
      {!hasApiKey && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-400">
              API key required
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-500">
              Add your AI provider API key in{" "}
              <Link href="/dashboard/settings" className="underline hover:no-underline">
                settings
              </Link>{" "}
              to enable the chat widget.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{activeTenant.name}</h1>
          <p className="text-muted-foreground">Your AI support bot dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/widget/${activeTenant.slug}`} target="_blank">
            <Button variant="outline" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Preview widget
            </Button>
          </Link>
          <Link href="/dashboard/settings">
            <Button variant="outline">Configure</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Conversations"
          value={conversationCount}
          description="Total support conversations"
          icon={<MessageSquare className="h-5 w-5" />}
          href="/dashboard/conversations"
        />
        <StatCard
          title="Traces"
          value={traceCount}
          description="AI interactions logged"
          icon={<BarChart3 className="h-5 w-5" />}
          href="/dashboard/traces"
        />
        <StatCard
          title="Documents"
          value={documentCount}
          description="Knowledge base articles"
          icon={<FileText className="h-5 w-5" />}
          href="/dashboard/documents"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent traces</CardTitle>
              <CardDescription>Latest AI interactions</CardDescription>
            </div>
            <Link href="/dashboard/traces">
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentTraces.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No traces yet. Start a conversation in the widget to see traces here.
              </p>
            ) : (
              <div className="space-y-3">
                {recentTraces.map((trace) => (
                  <Link
                    key={trace.id}
                    href={`/dashboard/traces/${trace.id}`}
                    className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium">{trace.modelName}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(trace.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {typeof trace.input === "object"
                        ? JSON.stringify(trace.input).slice(0, 100)
                        : String(trace.input).slice(0, 100)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Widget embed code</CardTitle>
            <CardDescription>Add this to your website</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                <code>{`<script 
  src="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/widget.js"
  data-tenant="${activeTenant.slug}"
  async
></script>`}</code>
              </pre>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Paste this code before the closing {`</body>`} tag on your website.
            </p>
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
  value: number;
  description: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="text-brand-500">{icon}</div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{value.toLocaleString()}</div>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function OnboardingView({ userName }: { userName: string }) {
  return (
    <div className="container px-6 py-16">
      <div className="mx-auto max-w-2xl space-y-6 text-center">
        <div className="animated-gradient mx-auto flex h-16 w-16 items-center justify-center rounded-2xl">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-bold">Welcome, {userName}!</h1>
          <p className="text-xl text-muted-foreground">
            Let&apos;s create your first AI support bot. It only takes a few minutes.
          </p>
        </div>
        <div className="pt-2">
          <Link href="/dashboard/settings/new">
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Create your first bot
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 pt-8 text-left md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="mb-2 text-2xl font-bold text-brand-500">1</div>
            <h3 className="mb-1 font-medium">Configure</h3>
            <p className="text-sm text-muted-foreground">
              Set up your bot&apos;s name, instructions, and AI provider
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="mb-2 text-2xl font-bold text-brand-500">2</div>
            <h3 className="mb-1 font-medium">Add knowledge</h3>
            <p className="text-sm text-muted-foreground">
              Upload documents to train your bot on your content
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="mb-2 text-2xl font-bold text-brand-500">3</div>
            <h3 className="mb-1 font-medium">Deploy</h3>
            <p className="text-sm text-muted-foreground">
              Embed the widget on your site and start helping customers
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
