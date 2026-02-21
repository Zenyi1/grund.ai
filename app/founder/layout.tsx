import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export default async function FounderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: founder } = await supabase
    .from("founders")
    .select("full_name, company_name")
    .eq("id", user.id)
    .single();

  if (!founder) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-bold text-gray-900">cracked.ai</span>
          <span className="text-gray-400">·</span>
          <span className="text-sm text-gray-600">{founder.company_name}</span>
          <div className="hidden sm:flex items-center gap-1 ml-4">
            <Link
              href="/founder/interview"
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
            >
              Interview
            </Link>
            <Link
              href="/founder/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </nav>
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
