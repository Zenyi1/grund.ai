import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VapiEndOfCallReport;

    if (body.message?.type !== "end-of-call-report") {
      return NextResponse.json({ received: true });
    }

    const { message } = body;
    const founderId = message.call?.metadata?.founderId;

    if (!founderId) {
      console.error("No founderId in call metadata");
      return NextResponse.json(
        { error: "Missing founderId" },
        { status: 400 }
      );
    }

    const rawTranscript =
      message.transcript ||
      message.messages
        ?.map((m) => `${m.role}: ${m.message}`)
        .join("\n") ||
      "";

    if (!rawTranscript) {
      console.error("No transcript in end-of-call report");
      return NextResponse.json(
        { error: "Missing transcript" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase.from("founder_profiles").insert({
      founder_id: founderId,
      raw_transcript: rawTranscript,
      interview_duration_sec: message.durationSeconds
        ? Math.round(message.durationSeconds)
        : null,
    });

    if (error) {
      console.error("Failed to save founder profile:", error);
      return NextResponse.json(
        { error: "Database insert failed" },
        { status: 500 }
      );
    }

    // TODO: Run Claude extraction to populate structured fields
    // (required_skills, preferred_skills, role_title, etc.)

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
