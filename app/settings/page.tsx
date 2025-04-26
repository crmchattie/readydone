import { redirect } from "next/navigation";
import { auth } from '@/app/(auth)/auth';
import { getUserById } from "@/lib/db/queries";
import { SettingsClient } from "@/components/settings-client";

export default async function SettingsPage() {
  const session = await auth();

  if (!session || !session.user || !session.user.id) { 
    redirect("/login");
  }

  const user = await getUserById({ id: session.user.id });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto max-w-5xl p-6 md:p-8">
      <SettingsClient user={user} />
    </div>
  );
} 