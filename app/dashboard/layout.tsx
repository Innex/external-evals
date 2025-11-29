import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { DashboardNav } from "./dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <main className="pt-16">{children}</main>
    </div>
  );
}
