import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export default async function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: candidate } = await supabase
    .from("candidates")
    .select("full_name")
    .eq("id", user.id)
    .single();

  if (!candidate) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white px-6 py-3 flex items-center justify-between">
        <span className="font-bold text-gray-900">FounderMatch</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{candidate.full_name}</span>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </nav>
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
