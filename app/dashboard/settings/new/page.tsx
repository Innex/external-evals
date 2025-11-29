import { auth } from "@/lib/auth";
import { CreateTenantForm } from "./create-tenant-form";

export default async function NewTenantPage() {
  const session = await auth();

  return (
    <div className="container py-8 px-6 max-w-2xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create support bot</h1>
          <p className="text-muted-foreground">
            Set up a new AI-powered support bot for your customers
          </p>
        </div>
        <CreateTenantForm userId={session!.user!.id!} />
      </div>
    </div>
  );
}

