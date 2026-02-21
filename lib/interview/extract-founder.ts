import { GoogleGenerativeAI } from "@google/generative-ai";
import { FOUNDER_EXTRACTION_SYSTEM_PROMPT } from "./founder-prompts";
import { createAdminClient } from "@/lib/supabase/server";

export interface FounderProfileExtraction {
  role_title: string | null;
  role_description: string | null;
  required_skills: string[] | null;
  preferred_skills: string[] | null;
  experience_level: "junior" | "mid" | "senior" | "lead" | null;
  work_style: "remote" | "hybrid" | "onsite" | null;
  culture_values: string[] | null;
  deal_breakers: string[] | null;
  weight_problem_solving: number;
  weight_communication: number;
  weight_ownership: number;
  weight_culture: number;
  weight_technical: number;
}

export async function extractFounderProfile(
  transcript: string
): Promise<FounderProfileExtraction> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: FOUNDER_EXTRACTION_SYSTEM_PROMPT,
    generationConfig: { temperature: 0 },
  });

  const result = await model.generateContent(
    `Here is the interview transcript:\n\n${transcript}`
  );
  const text = result.response.text();

  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  const parsed: FounderProfileExtraction = JSON.parse(cleaned);

  const sum =
    parsed.weight_problem_solving +
    parsed.weight_communication +
    parsed.weight_ownership +
    parsed.weight_culture +
    parsed.weight_technical;
  if (sum !== 100) {
    const scale = 100 / sum;
    parsed.weight_problem_solving = Math.round(parsed.weight_problem_solving * scale);
    parsed.weight_communication = Math.round(parsed.weight_communication * scale);
    parsed.weight_ownership = Math.round(parsed.weight_ownership * scale);
    parsed.weight_culture = Math.round(parsed.weight_culture * scale);
    parsed.weight_technical =
      100 -
      parsed.weight_problem_solving -
      parsed.weight_communication -
      parsed.weight_ownership -
      parsed.weight_culture;
  }

  return parsed;
}

export async function saveFounderProfile(
  founderId: string,
  transcript: string,
  extraction: FounderProfileExtraction,
  durationSec: number
) {
  const supabase = createAdminClient();

  await supabase
    .from("founder_profiles")
    .delete()
    .eq("founder_id", founderId);

  const row: Record<string, unknown> = {
    founder_id: founderId,
    raw_transcript: transcript,
    role_title: extraction.role_title,
    role_description: extraction.role_description,
    required_skills: extraction.required_skills ?? [],
    preferred_skills: extraction.preferred_skills ?? [],
    experience_level: extraction.experience_level,
    work_style: extraction.work_style,
    culture_values: extraction.culture_values ?? [],
    deal_breakers: extraction.deal_breakers ?? [],
    interview_duration_sec: durationSec,
  };

  const withWeights = {
    ...row,
    weight_problem_solving: extraction.weight_problem_solving,
    weight_communication: extraction.weight_communication,
    weight_ownership: extraction.weight_ownership,
    weight_culture: extraction.weight_culture,
    weight_technical: extraction.weight_technical,
  };

  let { data, error } = await supabase
    .from("founder_profiles")
    .insert(withWeights)
    .select("id")
    .single();

  if (error?.message?.includes("column")) {
    ({ data, error } = await supabase
      .from("founder_profiles")
      .insert(row)
      .select("id")
      .single());
  }

  if (error) throw new Error(`Failed to save founder profile: ${error.message}`);
  return data;
}
