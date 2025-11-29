import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardNav } from "./dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav 
        user={{
          id: user.id,
          name: user.fullName || user.firstName || "User",
          email: user.emailAddresses[0]?.emailAddress || "",
          image: user.imageUrl,
        }} 
      />
      <main className="pt-16">{children}</main>
    </div>
  );
}
