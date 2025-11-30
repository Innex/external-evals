"use client";

import { Check, Loader2, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface TenantSwitcherProps {
  tenants: { id: string; name: string; slug: string; role: string }[];
  activeTenantSlug: string | null;
}

export function TenantSwitcher({ tenants, activeTenantSlug }: TenantSwitcherProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [deletingTenantId, setDeletingTenantId] = useState<string | null>(null);

  const activeTenant = tenants.find((tenant) => tenant.slug === activeTenantSlug);

  const handleSwitch = (tenantSlug: string) => {
    if (tenantSlug === activeTenantSlug) return;
    startTransition(() => router.push(`/dashboard/${tenantSlug}`));
  };

  const handleDelete = async (tenantId: string, tenantName: string) => {
    if (
      !confirm(
        `Delete ${tenantName}? This permanently removes all documents, datasets, evals, and traces.`,
      )
    ) {
      return;
    }
    setDeletingTenantId(tenantId);
    try {
      const response = await fetch(`/api/tenants/${tenantId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete tenant");
      }
      startTransition(() => router.refresh());
    } catch (error) {
      console.error(error);
      alert("Failed to delete bot");
    } finally {
      setDeletingTenantId(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="max-w-[200px] justify-between gap-2 truncate"
        >
          <span className="truncate">{activeTenant?.name ?? "Select bot"}</span>
          <MoreHorizontal className="h-4 w-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        {tenants.length === 0 ? (
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create your first bot
            </Link>
          </DropdownMenuItem>
        ) : (
          <>
            {tenants.map((tenant) => (
              <DropdownMenuItem
                key={tenant.id}
                className="flex items-center gap-2"
                onSelect={(e) => {
                  e.preventDefault();
                  handleSwitch(tenant.slug);
                }}
              >
                <div className="flex-1">
                  <p className="truncate text-sm font-medium">{tenant.name}</p>
                  <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                </div>
                {tenant.slug === activeTenantSlug && (
                  <Check className="h-4 w-4 text-brand-500" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7 text-muted-foreground",
                    tenant.role !== "owner" && "hidden",
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete(tenant.id, tenant.name);
                  }}
                  disabled={deletingTenantId === tenant.id}
                >
                  {deletingTenantId === tenant.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings/new" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create new bot
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
