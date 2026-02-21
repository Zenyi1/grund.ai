"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function connectWithCandidate(
  candidateId: string,
  matchScoreId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("connections").insert({
    founder_id: user.id,
    candidate_id: candidateId,
    match_score_id: matchScoreId,
    status: "pending",
  });

  if (error) {
    // unique constraint — already connected
    if (error.code === "23505")
      return { error: "Already connected with this candidate." };
    return { error: error.message };
  }

  revalidatePath("/founder/dashboard");
  return { success: true };
}
