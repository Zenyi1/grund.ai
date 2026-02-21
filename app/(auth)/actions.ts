"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(_: unknown, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) return { error: error.message };

  // Route based on existing profile
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: founder } = await supabase
      .from("founders")
      .select("id")
      .eq("id", user.id)
      .single();
    if (founder) redirect("/founder/dashboard");

    const { data: candidate } = await supabase
      .from("candidates")
      .select("id")
      .eq("id", user.id)
      .single();
    if (candidate) redirect("/candidate/interview");
  }

  redirect("/onboarding");
}

export async function signup(_: unknown, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) return { error: error.message };

  redirect("/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function completeOnboarding(_: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = formData.get("role") as string;

  if (role === "founder") {
    const { error } = await supabase.from("founders").insert({
      id: user.id,
      full_name: formData.get("full_name") as string,
      company_name: formData.get("company_name") as string,
      company_description: (formData.get("company_description") as string) || null,
      website: (formData.get("website") as string) || null,
    });
    if (error) return { error: error.message };
    redirect("/founder/dashboard");
  }

  if (role === "candidate") {
    const { error } = await supabase.from("candidates").insert({
      id: user.id,
      full_name: formData.get("full_name") as string,
      email: user.email!,
      linkedin_url: (formData.get("linkedin_url") as string) || null,
    });
    if (error) return { error: error.message };
    redirect("/candidate/interview");
  }

  return { error: "Please select a role." };
}
