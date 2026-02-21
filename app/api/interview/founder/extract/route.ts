import { createClient } from "@/lib/supabase/server";
import {
  extractFounderProfile,
  saveFounderProfile,
} from "@/lib/interview/extract-founder";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: founder } = await supabase
    .from("founders")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!founder) {
    return Response.json({ error: "Founder not found" }, { status: 404 });
  }

  const { transcript, durationSec } = await req.json();

  if (!transcript || typeof transcript !== "string") {
    return Response.json({ error: "Missing transcript" }, { status: 400 });
  }

  try {
    const extraction = await extractFounderProfile(transcript);
    const saved = await saveFounderProfile(
      founder.id,
      transcript,
      extraction,
      durationSec ?? 0
    );

    return Response.json({ profileId: saved?.id ?? null, extraction });
  } catch (err) {
    console.error("Extraction/save error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: `Failed to process interview: ${message}` },
      { status: 500 }
    );
  }
}
