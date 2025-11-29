import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { tenants } from "@/db/schema";

import { WidgetChat } from "./widget-chat";

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, slug),
  });

  if (!tenant || !tenant.widgetEnabled) {
    notFound();
  }

  return (
    <WidgetChat
      tenant={{
        slug: tenant.slug,
        name: tenant.name,
        primaryColor: tenant.primaryColor,
        accentColor: tenant.accentColor,
        welcomeMessage: tenant.welcomeMessage,
        logoUrl: tenant.logoUrl,
      }}
    />
  );
}
