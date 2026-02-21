export type Weights = {
  skills: number
  experience: number
  culture: number
  technical: number
}

export type NormalizedWeights = Weights // same shape, values sum to 1.0

export type CandidateRow = {
  full_name: string
  email: string
  linkedin_url: string | null
}

export type CandidateProfileRow = {
  candidate_id: string
  skills: string[] | null
  experience_years: number | null
  experience_level: string | null
  strengths: string[] | null
  behavioral_summary: string | null
  behavioral_score: number | null
  system_design_score: number | null
  candidates: CandidateRow | null
}

export type MatchRow = {
  id: string
  candidate_profile_id: string
  skill_match_score: number | null
  experience_match_score: number | null
  culture_match_score: number | null
  technical_score: number | null
  overall_match_score: number | null
  match_reasoning: string | null
  candidate_profiles: CandidateProfileRow | null
}

export type RankedMatch = MatchRow & {
  weightedScore: number
  isConnected: boolean
}

export type FounderProfileSummary = {
  id: string
  role_title: string | null
  required_skills: string[] | null
}
