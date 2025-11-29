import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  MessageSquare, 
  BarChart3, 
  FileText, 
  Plus,
  ArrowRight,
  Sparkles,
  AlertCircle
} from "lucide-react";

// Demo data for now - in production this would come from the database
const DEMO_TENANT = {
  id: "demo-tenant-id",
  name: "Acme Support",
  slug: "demo-support",
};

export default async function DashboardPage() {
  const user = await currentUser();
  
  if (!user) {
    return <OnboardingView userName="there" />;
  }

  // For demo purposes, show sample data
  // In production, query the database for real tenant data
  const activeTenant = DEMO_TENANT;
  const conversationCount = 12;
  const traceCount = 47;
  const documentCount = 3;
  const recentTraces = [
    { id: "1", modelName: "gpt-4o-mini", createdAt: new Date(), input: { message: "How do I reset my password?" } },
    { id: "2", modelName: "gpt-4o-mini", createdAt: new Date(Date.now() - 3600000), input: { message: "What are your pricing plans?" } },
    { id: "3", modelName: "gpt-4o-mini", createdAt: new Date(Date.now() - 7200000), input: { message: "How do I contact support?" } },
  ];

  return (
    <div className="container py-8 px-6 space-y-8">
      {/* Demo mode banner */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-700 dark:text-amber-400">Demo mode</p>
          <p className="text-sm text-amber-600 dark:text-amber-500">
            You&apos;re viewing sample data. To use the full app, set up a PostgreSQL database and add your API keys in settings.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{activeTenant.name}</h1>
          <p className="text-muted-foreground">
            Your AI support bot dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/widget/${activeTenant.slug}`} target="_blank">
            <Button variant="outline" className="gap-2">
              <MessageSquare className="w-4 h-4" />
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
          icon={<MessageSquare className="w-5 h-5" />}
          href="/dashboard/conversations"
        />
        <StatCard
          title="Traces"
          value={traceCount}
          description="AI interactions logged"
          icon={<BarChart3 className="w-5 h-5" />}
          href="/dashboard/traces"
        />
        <StatCard
          title="Documents"
          value={documentCount}
          description="Knowledge base articles"
          icon={<FileText className="w-5 h-5" />}
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
                View all <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTraces.map((trace) => (
                <div
                  key={trace.id}
                  className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{trace.modelName}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(trace.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {JSON.stringify(trace.input).slice(0, 100)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Widget embed code</CardTitle>
            <CardDescription>Add this to your website</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="p-4 rounded-lg bg-muted text-sm overflow-x-auto">
                <code>{`<script 
  src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/widget.js"
  data-tenant="${activeTenant.slug}"
  async
></script>`}</code>
              </pre>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
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
  href 
}: { 
  title: string; 
  value: number; 
  description: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="text-brand-500">{icon}</div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{value.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function OnboardingView({ userName }: { userName: string }) {
  return (
    <div className="container py-16 px-6">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <div className="w-16 h-16 rounded-2xl animated-gradient flex items-center justify-center mx-auto">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Welcome, {userName}!</h1>
          <p className="text-xl text-muted-foreground">
            Let&apos;s create your first AI support bot. It only takes a few minutes.
          </p>
        </div>
        <Link href="/dashboard/settings/new">
          <Button size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            Create your first bot
          </Button>
        </Link>
        <div className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="p-4 rounded-lg border">
            <div className="text-2xl font-bold text-brand-500 mb-2">1</div>
            <h3 className="font-medium mb-1">Configure</h3>
            <p className="text-sm text-muted-foreground">
              Set up your bot&apos;s name, instructions, and AI provider
            </p>
          </div>
          <div className="p-4 rounded-lg border">
            <div className="text-2xl font-bold text-brand-500 mb-2">2</div>
            <h3 className="font-medium mb-1">Add knowledge</h3>
            <p className="text-sm text-muted-foreground">
              Upload documents to train your bot on your content
            </p>
          </div>
          <div className="p-4 rounded-lg border">
            <div className="text-2xl font-bold text-brand-500 mb-2">3</div>
            <h3 className="font-medium mb-1">Deploy</h3>
            <p className="text-sm text-muted-foreground">
              Embed the widget on your site and start helping customers
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
