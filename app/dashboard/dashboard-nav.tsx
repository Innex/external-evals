"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  LayoutDashboard, 
  Settings, 
  FileText, 
  BarChart3,
  Database,
  FlaskConical,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface DashboardNavProps {
  user: User;
}

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/dashboard/traces", label: "Traces", icon: BarChart3 },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/datasets", label: "Datasets", icon: Database },
  { href: "/dashboard/evals", label: "Evals", icon: FlaskConical },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container h-full flex items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg animated-gradient flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg hidden sm:inline">SupportHub</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || 
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "gap-2",
                      isActive && "bg-brand-500/10 text-brand-600 dark:text-brand-400"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/settings/new">
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
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
