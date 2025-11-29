import {
  ArrowRight,
  BarChart3,
  FileText,
  Globe,
  MessageSquare,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="glass fixed left-0 right-0 top-0 z-50 border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="animated-gradient flex h-8 w-8 items-center justify-center rounded-lg">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold">SupportHub</span>
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
      <section className="px-6 pb-20 pt-32">
        <div className="container mx-auto max-w-6xl">
          <div className="space-y-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-600 dark:text-brand-400">
              <Sparkles className="h-4 w-4" />
              Powered by AI & Braintrust evals
            </div>
            <h1 className="text-5xl font-bold tracking-tight md:text-7xl">
              Customer support
              <br />
              <span className="gradient-text">that learns</span>
            </h1>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Build intelligent, customizable support bots for your customers. Trace every
              interaction, evaluate performance, and continuously improve.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Link href="/sign-up">
                <Button size="lg" className="gap-2">
                  Start building <ArrowRight className="h-4 w-4" />
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
          <div className="relative mt-20">
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-transparent to-transparent" />
            <div className="overflow-hidden rounded-xl border bg-card shadow-2xl">
              <div className="flex h-8 items-center gap-2 bg-muted px-4">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
              </div>
              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
                <div className="col-span-2 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500">
                      <MessageSquare className="h-4 w-4 text-white" />
                    </div>
                    <div className="max-w-md rounded-lg rounded-tl-none bg-muted p-3">
                      <p className="text-sm">How do I reset my password?</p>
                    </div>
                  </div>
                  <div className="flex flex-row-reverse items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div className="max-w-md rounded-lg rounded-tr-none bg-brand-500/10 p-3">
                      <p className="text-sm">
                        I can help you reset your password! Go to Settings → Security →
                        Reset password. You&apos;ll receive an email with a reset link.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 border-l pl-4">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Live metrics
                  </div>
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
      <section id="features" className="bg-muted/30 px-6 py-20">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-16 space-y-4 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Everything you need</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              A complete platform for building, deploying, and optimizing AI-powered
              customer support.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<MessageSquare className="h-6 w-6" />}
              title="Embeddable widget"
              description="Drop a simple script tag and get a beautiful chat widget that matches your brand."
            />
            <FeatureCard
              icon={<FileText className="h-6 w-6" />}
              title="Knowledge base"
              description="Upload markdown documents and let AI learn from your content with smart embeddings."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Multi-provider AI"
              description="Use OpenAI, Anthropic, or Google AI. Switch providers without changing code."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Braintrust tracing"
              description="Every request is traced. View inputs, outputs, and metrics in real-time."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Evaluation & datasets"
              description="Save examples, annotate responses, and run evaluations to improve quality."
            />
            <FeatureCard
              icon={<Globe className="h-6 w-6" />}
              title="Multi-tenant"
              description="Each customer gets their own isolated environment with custom branding."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="animated-gradient rounded-2xl p-[1px]">
            <div className="space-y-6 rounded-2xl bg-background p-12">
              <h2 className="text-3xl font-bold md:text-4xl">
                Ready to transform your support?
              </h2>
              <p className="mx-auto max-w-xl text-muted-foreground">
                Join teams using SupportHub to deliver exceptional customer experiences
                with AI that continuously learns and improves.
              </p>
              <Link href="/sign-up">
                <Button size="lg" className="gap-2">
                  Get started free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="animated-gradient flex h-8 w-8 items-center justify-center rounded-lg">
                <MessageSquare className="h-5 w-5 text-white" />
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
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-xl border bg-card p-6 transition-all duration-300 hover:border-brand-500/50 hover:shadow-lg">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 transition-colors group-hover:bg-brand-500 group-hover:text-white dark:text-brand-400">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
