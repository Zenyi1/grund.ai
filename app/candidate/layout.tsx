import Link from "next/link";
import Image from "next/image";
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
        <div className="flex items-center gap-4">
          <Link href="/candidate/interview">
            <Image src="/logo.svg" alt="cracked" width={140} height={28} priority />
          </Link>
          <div className="hidden sm:flex items-center gap-1 ml-4">
            <Link
              href="/candidate/interview"
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
            >
              Interview
            </Link>
          </div>
        </div>
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
