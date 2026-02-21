import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  extractSkillsFromTranscript,
  generateSystemDesignQuestion,
} from "@/lib/interview/question-generator";

interface VapiEndOfCallReport {
  message: {
    type: string;
    endedReason?: string;
    transcript?: string;
    messages?: Array<{
      role: string;
      message: string;
      time: number;
      secondsFromStart: number;
    }>;
    call?: {
      id: string;
      assistantId?: string;
      metadata?: Record<string, string>;
    };
    durationSeconds?: number;
    summary?: string;
  };
}

const FALLBACK_QUESTION =
  "Design a URL shortener service like bit.ly. Walk me through your architecture, how you'd handle high traffic, and how you'd store and look up the mappings efficiently.";

function extractTranscript(message: VapiEndOfCallReport["message"]): string {
  return (
    message.transcript ||
    message.messages?.map((m) => `${m.role}: ${m.message}`).join("\n") ||
    ""
  );
}

// Vapi expects a 200 response to acknowledge receipt.
// Always return 200 — log errors internally rather than returning 4xx/5xx.
export async function POST(request: NextRequest) {
  let body: VapiEndOfCallReport;

  try {
    body = (await request.json()) as VapiEndOfCallReport;
  } catch {
    console.error("Candidate webhook: failed to parse JSON body");
    return NextResponse.json({ received: true });
  }

  if (body.message?.type !== "end-of-call-report") {
    return NextResponse.json({ received: true });
  }

  const { message } = body;
  const candidateId = message.call?.metadata?.candidateId;
  const phase = message.call?.metadata?.phase;

  if (!candidateId) {
    console.error("Candidate webhook: no candidateId in call metadata");
    return NextResponse.json({ received: true });
  }

  const rawTranscript = extractTranscript(message);
  if (!rawTranscript) {
    console.error("Candidate webhook: no transcript in end-of-call report for candidate", candidateId);
    return NextResponse.json({ received: true });
  }

  const supabase = createAdminClient();

  try {
    if (phase === "1") {
      await handlePhase1(supabase, candidateId, rawTranscript, message);
    } else if (phase === "2") {
      await handlePhase2(supabase, candidateId, rawTranscript, message);
    } else {
      console.error("Candidate webhook: unknown phase", phase, "for candidate", candidateId);
    }
  } catch (err) {
    console.error("Candidate webhook: unhandled error for candidate", candidateId, err);
  }

  // Always 200 so Vapi doesn't retry
  return NextResponse.json({ received: true });
}

async function handlePhase1(
  supabase: ReturnType<typeof createAdminClient>,
  candidateId: string,
  transcript: string,
  message: VapiEndOfCallReport["message"]
) {
  // Extract skills — fall back to empty array if Claude fails
  let skills: string[] = [];
  try {
    skills = await extractSkillsFromTranscript(transcript);
  } catch (err) {
    console.error("Phase 1: skill extraction failed, using empty skills:", err);
  }

  // Generate system design question — fall back to default if Claude fails
  let question = FALLBACK_QUESTION;
  let matchedFounderProfileId: string | null = null;
  try {
    const result = await generateSystemDesignQuestion(transcript, skills);
    question = result.question;
    matchedFounderProfileId = result.matchedFounderProfileId;
  } catch (err) {
    console.error("Phase 1: question generation failed, using fallback:", err);
  }

  const { error } = await supabase.from("candidate_profiles").insert({
    candidate_id: candidateId,
    raw_transcript: transcript,
    skills,
    system_design_question: question,
    interview_duration_sec: message.durationSeconds
      ? Math.round(message.durationSeconds)
      : null,
  });

  if (error) {
    // If a profile already exists (e.g., duplicate webhook), log and continue
    console.error("Phase 1: DB insert failed for candidate", candidateId, error);
    return;
  }

  console.log(
    "Phase 1 complete | candidate:", candidateId,
    "| skills:", skills,
    "| matched founder profile:", matchedFounderProfileId
  );
}

async function handlePhase2(
  supabase: ReturnType<typeof createAdminClient>,
  candidateId: string,
  phase2Transcript: string,
  message: VapiEndOfCallReport["message"]
) {
  const { data: existing, error: fetchError } = await supabase
    .from("candidate_profiles")
    .select("id, raw_transcript, interview_duration_sec")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (fetchError || !existing) {
    console.error("Phase 2: no Phase 1 profile found for candidate:", candidateId, fetchError);
    return;
  }

  const combinedTranscript = `${existing.raw_transcript}\n\n--- SYSTEM DESIGN PHASE ---\n\n${phase2Transcript}`;

  const phase2Duration = message.durationSeconds
    ? Math.round(message.durationSeconds)
    : 0;
  const totalDuration = (existing.interview_duration_sec || 0) + phase2Duration;

  const { error: updateError } = await supabase
    .from("candidate_profiles")
    .update({
      raw_transcript: combinedTranscript,
      interview_duration_sec: totalDuration,
    })
    .eq("id", existing.id);

  if (updateError) {
    console.error("Phase 2: DB update failed for candidate", candidateId, updateError);
    return;
  }

  // TODO: Run Claude evaluation to populate behavioral_score,
  // system_design_score, overall_score, behavioral_summary, etc.
  // TODO: Trigger matching engine

  console.log("Phase 2 complete | candidate:", candidateId, "| total duration:", totalDuration, "s");
}
