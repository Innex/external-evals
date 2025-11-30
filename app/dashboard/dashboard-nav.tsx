"use client";

import { UserButton } from "@clerk/nextjs";
import {
  Database,
  FileText,
  FlaskConical,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { TenantSwitcher } from "./tenant-switcher";

const buildNavItems = (slug: string | null) => {
  const base = slug ? `/dashboard/${slug}` : "/dashboard";
  return [
    { href: base, label: "Overview", icon: LayoutDashboard },
    { href: `${base}/conversations`, label: "Conversations", icon: MessageSquare },
    { href: `${base}/documents`, label: "Documents", icon: FileText },
    { href: `${base}/datasets`, label: "Datasets", icon: Database },
    { href: `${base}/evals`, label: "Evals", icon: FlaskConical },
    { href: `${base}/settings`, label: "Settings", icon: Settings },
  ];
};

interface DashboardNavProps {
  tenants: { id: string; name: string; slug: string; role: string }[];
  activeTenantSlug: string | null;
}

export function DashboardNav({
  tenants,
  activeTenantSlug,
}: DashboardNavProps): JSX.Element {
  const pathname = usePathname();

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link
            href={activeTenantSlug ? `/dashboard/${activeTenantSlug}` : "/dashboard"}
            className="flex items-center gap-2"
          >
            <div className="animated-gradient flex h-8 w-8 items-center justify-center rounded-lg">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <span className="hidden text-lg font-semibold sm:inline">SupportHub</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {buildNavItems(activeTenantSlug)
              .slice(0, 5)
              .map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "gap-2",
                        isActive && "bg-brand-500/10 text-brand-600 dark:text-brand-400",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {tenants.length > 0 && (
            <TenantSwitcher tenants={tenants} activeTenantSlug={activeTenantSlug} />
          )}
          <Link href="/dashboard/settings/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New bot</span>
            </Button>
          </Link>

          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-9 h-9",
              },
            }}
          />
        </div>
      </div>
    </nav>
  );
}
