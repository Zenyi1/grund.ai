import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const candidateId = request.nextUrl.searchParams.get("candidateId");

  if (!candidateId) {
    return NextResponse.json(
      { error: "Missing candidateId" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("candidate_profiles")
    .select("system_design_question")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return NextResponse.json({ ready: false });
  }

  if (!data.system_design_question) {
    return NextResponse.json({ ready: false });
  }

  return NextResponse.json({
    ready: true,
    question: data.system_design_question,
  });
}
