-- FounderMatch: Row Level Security Policies
-- Migration: 002_rls_policies
-- Applied: 2026-02-21

-- RLS: Founders (own row only)
alter table public.founders enable row level security;
create policy "founders_own" on public.founders
  for all using (auth.uid() = id);

-- RLS: Founder profiles (founder manages their own profiles)
alter table public.founder_profiles enable row level security;
create policy "founder_profiles_own" on public.founder_profiles
  for all using (
    founder_id in (
      select id from public.founders where id = auth.uid()
    )
  );

-- RLS: Match scores (founders see matches for their profiles)
alter table public.match_scores enable row level security;
create policy "founder_sees_matches" on public.match_scores
  for select using (
    founder_profile_id in (
      select id from public.founder_profiles where founder_id = auth.uid()
    )
  );

-- RLS: Candidates (own row only)
alter table public.candidates enable row level security;
create policy "candidates_own" on public.candidates
  for all using (auth.uid() = id);

-- RLS: Candidate profiles (candidate manages their own)
alter table public.candidate_profiles enable row level security;
create policy "candidate_profiles_own" on public.candidate_profiles
  for all using (
    candidate_id in (
      select id from public.candidates where id = auth.uid()
    )
  );

-- RLS: Connections (founders see/manage their connections, candidates can view)
alter table public.connections enable row level security;
create policy "founder_sees_connections" on public.connections
  for all using (founder_id = auth.uid());
create policy "candidate_sees_connections" on public.connections
  for select using (candidate_id = auth.uid());
