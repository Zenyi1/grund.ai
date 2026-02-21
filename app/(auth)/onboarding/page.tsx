import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "./form";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: founder } = await supabase
    .from("founders")
    .select("id")
    .eq("id", user.id)
    .single();

  if (founder) {
    const { data: founderProfile } = await supabase
      .from("founder_profiles")
      .select("id")
      .eq("founder_id", user.id)
      .limit(1)
      .single();

    redirect(founderProfile ? "/founder/dashboard" : "/founder/interview");
  }

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id")
    .eq("id", user.id)
    .single();

  if (candidate) redirect("/candidate/interview");

  return <OnboardingForm />;
}
