import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  Zap, 
  BarChart3, 
  FileText, 
  ArrowRight,
  Sparkles,
  Shield,
  Globe
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg animated-gradient flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">SupportHub</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Powered by AI & Braintrust evals
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Customer support
              <br />
              <span className="gradient-text">that learns</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Build intelligent, customizable support bots for your customers. 
              Trace every interaction, evaluate performance, and continuously improve.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Link href="/sign-up">
                <Button size="lg" className="gap-2">
                  Start building <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline">
                  Learn more
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
            <div className="rounded-xl border bg-card shadow-2xl overflow-hidden">
              <div className="h-8 bg-muted flex items-center gap-2 px-4">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-2 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-muted rounded-lg rounded-tl-none p-3 max-w-md">
                      <p className="text-sm">How do I reset my password?</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-brand-500/10 rounded-lg rounded-tr-none p-3 max-w-md">
                      <p className="text-sm">I can help you reset your password! Go to Settings → Security → Reset password. You&apos;ll receive an email with a reset link.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 border-l pl-4">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Live metrics</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Response time</span>
                      <span className="font-medium text-green-500">1.2s</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Accuracy</span>
                      <span className="font-medium text-green-500">98%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Satisfaction</span>
                      <span className="font-medium text-green-500">4.8/5</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Everything you need</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete platform for building, deploying, and optimizing AI-powered customer support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<MessageSquare className="w-6 h-6" />}
              title="Embeddable widget"
              description="Drop a simple script tag and get a beautiful chat widget that matches your brand."
            />
            <FeatureCard
              icon={<FileText className="w-6 h-6" />}
              title="Knowledge base"
              description="Upload markdown documents and let AI learn from your content with smart embeddings."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Multi-provider AI"
              description="Use OpenAI, Anthropic, or Google AI. Switch providers without changing code."
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Braintrust tracing"
              description="Every request is traced. View inputs, outputs, and metrics in real-time."
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Evaluation & datasets"
              description="Save examples, annotate responses, and run evaluations to improve quality."
            />
            <FeatureCard
              icon={<Globe className="w-6 h-6" />}
              title="Multi-tenant"
              description="Each customer gets their own isolated environment with custom branding."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="rounded-2xl animated-gradient p-[1px]">
            <div className="bg-background rounded-2xl p-12 space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                Ready to transform your support?
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Join teams using SupportHub to deliver exceptional customer experiences 
                with AI that continuously learns and improves.
              </p>
              <Link href="/sign-up">
                <Button size="lg" className="gap-2">
                  Get started free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg animated-gradient flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold">SupportHub</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built with Next.js, Vercel AI SDK, and Braintrust
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="group p-6 rounded-xl border bg-card hover:shadow-lg transition-all duration-300 hover:border-brand-500/50">
      <div className="w-12 h-12 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4 group-hover:bg-brand-500 group-hover:text-white transition-colors">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}

