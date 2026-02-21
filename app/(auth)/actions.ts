"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

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
    const { data: founder, error: founderError } = await supabase
      .from("founders")
      .select("id")
      .eq("id", user.id)
      .single();
    if (founderError && founderError.code !== "PGRST116") {
      console.error("Login: founder check failed:", founderError);
    }
    if (founder) {
      const { data: founderProfile } = await supabase
        .from("founder_profiles")
        .select("id")
        .eq("founder_id", user.id)
        .limit(1)
        .single();
      redirect(founderProfile ? "/founder/dashboard" : "/founder/interview");
    }

    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("id")
      .eq("id", user.id)
      .single();
    if (candidateError && candidateError.code !== "PGRST116") {
      console.error("Login: candidate check failed:", candidateError);
    }
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

  // If a profile already exists for the selected role (e.g. user navigated back
  // to /onboarding), just redirect instead of attempting a duplicate insert.
  // Check is scoped to the selected role so a founder record never blocks a
  // candidate submission and vice versa.

  if (role === "founder") {
    const { data: existing } = await supabase
      .from("founders")
      .select("id")
      .eq("id", user.id)
      .single();

    if (existing) {
      const { data: founderProfile } = await supabase
        .from("founder_profiles")
        .select("id")
        .eq("founder_id", user.id)
        .limit(1)
        .single();
      redirect(founderProfile ? "/founder/dashboard" : "/founder/interview");
    }

    const { error } = await supabase.from("founders").insert({
      id: user.id,
      full_name: formData.get("full_name") as string,
      company_name: formData.get("company_name") as string,
      company_description: (formData.get("company_description") as string) || null,
      website: (formData.get("website") as string) || null,
    });
    if (error) return { error: error.message };
    redirect("/founder/interview");
  }

  if (role === "candidate") {
    const { data: existing } = await supabase
      .from("candidates")
      .select("id")
      .eq("id", user.id)
      .single();
    if (existing) redirect("/candidate/interview");

    let cvUrl: string | null = null;
    const cvFile = formData.get("cv_file") as File | null;
    if (cvFile && cvFile.size > 0) {
      try {
        const admin = createAdminClient();
        const ext = cvFile.name.split(".").pop()?.toLowerCase() ?? "pdf";
        const filename = `${user.id}-${Date.now()}.${ext}`;
        const bytes = await cvFile.arrayBuffer();
        const { data: uploadData } = await admin.storage
          .from("resumes")
          .upload(filename, bytes, { contentType: cvFile.type });
        if (uploadData) {
          cvUrl = uploadData.path;
        }
      } catch (err) {
        console.error("CV upload failed (non-blocking):", err);
      }
    }

    const linkedinUrl = (formData.get("linkedin_url") as string).trim();
    if (!linkedinUrl) return { error: "LinkedIn URL is required." };

    const { error } = await supabase.from("candidates").insert({
      id: user.id,
      full_name: formData.get("full_name") as string,
      email: user.email!,
      linkedin_url: linkedinUrl,
      cv_url: cvUrl,
    });
    if (error) return { error: error.message };
    redirect("/candidate/interview");
  }

  return { error: "Please select a role." };
}
