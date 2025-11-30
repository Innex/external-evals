import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { CreateTenantForm } from "./create-tenant-form";

export default async function NewTenantPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="container max-w-2xl px-6 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create support bot</h1>
          <p className="text-muted-foreground">
            Set up a new AI-powered support bot for your customers
          </p>
        </div>
        <CreateTenantForm />
      </div>
    </div>
  );
}
