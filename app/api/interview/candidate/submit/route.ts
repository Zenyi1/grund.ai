import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  extractSkillsFromTranscript,
  generateSystemDesignQuestion,
} from "@/lib/interview/question-generator";
import { evaluateCandidate } from "@/lib/interview/evaluate-candidate";
import { runMatchingForCandidate } from "@/lib/matching/engine";

/**
 * Direct client-to-server submission route.
 * Used instead of Vapi webhooks so the flow works in local development
 * and doesn't depend on Vapi's cloud being able to reach our server.
 *
 * Phase 1: saves transcript + generates system design question, returns { question }
 * Phase 2: saves combined transcript + runs evaluation, returns { success: true }
 */
export async function POST(request: NextRequest) {
  let body: { phase: "1" | "2"; candidateId: string; transcript: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { phase, candidateId, transcript } = body;

  if (!candidateId || !transcript || !phase) {
    return NextResponse.json(
      { error: "Missing phase, candidateId, or transcript" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  if (phase === "1") {
    // Extract skills (falls back to [] if no API key)
    const skills = await extractSkillsFromTranscript(transcript);

    // Generate system design question (falls back to hardcoded question if no API key)
    const { question, matchedFounderProfileId } =
      await generateSystemDesignQuestion(transcript, skills);

    // Check if a profile already exists for this candidate (e.g. page reload mid-interview)
    const { data: existing } = await supabase
      .from("candidate_profiles")
      .select("id, system_design_question")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existing?.system_design_question) {
      // Already processed — return the saved question immediately
      console.log("Phase 1: existing profile found for candidate", candidateId);
      return NextResponse.json({ question: existing.system_design_question });
    }

    const { error } = await supabase.from("candidate_profiles").insert({
      candidate_id: candidateId,
      raw_transcript: transcript,
      skills,
      system_design_question: question,
    });

    if (error) {
      console.error("Submit phase 1: DB insert failed:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    console.log(
      "Phase 1 submitted | candidate:", candidateId,
      "| skills:", skills,
      "| matched founder profile:", matchedFounderProfileId
    );

    return NextResponse.json({ question });
  }

  if (phase === "2") {
    const { data: existing, error: fetchError } = await supabase
      .from("candidate_profiles")
      .select("id, raw_transcript, interview_duration_sec")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !existing) {
      console.error("Submit phase 2: no phase 1 profile found:", fetchError);
      return NextResponse.json(
        { error: "Phase 1 profile not found" },
        { status: 404 }
      );
    }

    const combinedTranscript = `${existing.raw_transcript}\n\n--- SYSTEM DESIGN PHASE ---\n\n${transcript}`;

    // Run Claude evaluation
    const evaluation = await evaluateCandidate(combinedTranscript);

    const updatePayload: Record<string, unknown> = {
      raw_transcript: combinedTranscript,
    };

    if (evaluation) {
      updatePayload.behavioral_summary = evaluation.behavioral_summary;
      updatePayload.behavioral_score = evaluation.behavioral_score;
      updatePayload.system_design_summary = evaluation.system_design_summary;
      updatePayload.system_design_score = evaluation.system_design_score;
      updatePayload.overall_score = evaluation.overall_score;
      updatePayload.experience_years = evaluation.experience_years;
      updatePayload.experience_level = evaluation.experience_level;
      updatePayload.strengths = evaluation.strengths;
      updatePayload.work_style_preference = evaluation.work_style_preference;
    }

    const { error: updateError } = await supabase
      .from("candidate_profiles")
      .update(updatePayload)
      .eq("id", existing.id);

    if (updateError) {
      console.error("Submit phase 2: DB update failed:", updateError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    console.log(
      "Phase 2 submitted | candidate:", candidateId,
      "| overall score:", evaluation?.overall_score ?? "not evaluated"
    );

    // Run matching engine async — don't block the response
    runMatchingForCandidate(existing.id).catch((err) =>
      console.error("Matching engine error:", err)
    );

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid phase" }, { status: 400 });
}
