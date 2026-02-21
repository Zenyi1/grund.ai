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

function extractTranscript(message: VapiEndOfCallReport["message"]): string {
  return (
    message.transcript ||
    message.messages?.map((m) => `${m.role}: ${m.message}`).join("\n") ||
    ""
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VapiEndOfCallReport;

    if (body.message?.type !== "end-of-call-report") {
      return NextResponse.json({ received: true });
    }

    const { message } = body;
    const candidateId = message.call?.metadata?.candidateId;
    const phase = message.call?.metadata?.phase;

    if (!candidateId) {
      console.error("No candidateId in call metadata");
      return NextResponse.json(
        { error: "Missing candidateId" },
        { status: 400 }
      );
    }

    const rawTranscript = extractTranscript(message);
    if (!rawTranscript) {
      console.error("No transcript in end-of-call report");
      return NextResponse.json(
        { error: "Missing transcript" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    if (phase === "1") {
      return await handlePhase1(supabase, candidateId, rawTranscript, message);
    } else if (phase === "2") {
      return await handlePhase2(supabase, candidateId, rawTranscript, message);
    }

    console.error("Unknown phase:", phase);
    return NextResponse.json({ error: "Unknown phase" }, { status: 400 });
  } catch (err) {
    console.error("Candidate webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handlePhase1(
  supabase: ReturnType<typeof createAdminClient>,
  candidateId: string,
  transcript: string,
  message: VapiEndOfCallReport["message"]
) {
  const skills = await extractSkillsFromTranscript(transcript);

  const { question, matchedFounderProfileId } =
    await generateSystemDesignQuestion(transcript, skills);

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
    console.error("Failed to save Phase 1 data:", error);
    return NextResponse.json(
      { error: "Database insert failed" },
      { status: 500 }
    );
  }

  console.log(
    "Phase 1 complete for candidate",
    candidateId,
    "| Skills:",
    skills,
    "| Matched founder profile:",
    matchedFounderProfileId
  );

  return NextResponse.json({ success: true, phase: 1 });
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
    console.error("No Phase 1 profile found for candidate:", candidateId);
    return NextResponse.json(
      { error: "Phase 1 profile not found" },
      { status: 400 }
    );
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
    console.error("Failed to update Phase 2 data:", updateError);
    return NextResponse.json(
      { error: "Database update failed" },
      { status: 500 }
    );
  }

  // TODO: Run Claude evaluation to populate behavioral_score,
  // system_design_score, overall_score, behavioral_summary, etc.
  // TODO: Trigger matching engine

  console.log("Phase 2 complete for candidate", candidateId);

  return NextResponse.json({ success: true, phase: 2 });
}
