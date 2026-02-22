const LEVEL_ORDER = ["junior", "mid", "senior", "lead"];

/**
 * Skill match score (0–10).
 * All required + some preferred = up to 10.
 * All required = 7, proportional below.
 * Each preferred skill adds +1 (capped at 10 total).
 */
export function calcSkillMatchScore(
  candidateSkills: string[],
  requiredSkills: string[],
  preferredSkills: string[]
): number {
  if (!requiredSkills.length) return 5; // no requirements → neutral

  const c = candidateSkills.map((s) => s.toLowerCase());
  const r = requiredSkills.map((s) => s.toLowerCase());
  const p = preferredSkills.map((s) => s.toLowerCase());

  const matchedRequired = r.filter((s) => c.some((cs) => cs.includes(s) || s.includes(cs)));
  const matchedPreferred = p.filter((s) => c.some((cs) => cs.includes(s) || s.includes(cs)));

  let score: number;
  if (matchedRequired.length === r.length) {
    score = 7.7;
  } else if (matchedRequired.length > 0) {
    score = (matchedRequired.length / r.length) * 7.7;
  } else {
    score = 0;
  }

  score = Math.min(10, score + matchedPreferred.length);
  return Math.round(score * 10) / 10;
}

/**
 * Experience level match score (0–10).
 * Exact = 10, one above = 8 (overqualified), one below = 5 (stretch), 2+ off = 2.
 */
export function calcExperienceMatchScore(
  candidateLevel: string | null,
  founderLevel: string | null
): number {
  if (!candidateLevel || !founderLevel) return 5; // unknown → neutral

  const cIdx = LEVEL_ORDER.indexOf(candidateLevel.toLowerCase());
  const fIdx = LEVEL_ORDER.indexOf(founderLevel.toLowerCase());

  if (cIdx === -1 || fIdx === -1) return 5;

  const diff = cIdx - fIdx;
  if (diff === 0) return 10;
  if (diff === 1) return 8;  // one level above — overqualified but fine
  if (diff === -1) return 6; // one level below — stretch
  return 2;                   // two+ levels off
}

/**
 * Culture / soft match score (0–10).
 * Work style match = 5 pts, culture value overlap = up to 5 pts.
 */
export function calcCultureMatchScore(
  workStylePref: string | null,
  founderWorkStyle: string | null,
  strengths: string[],
  cultureValues: string[]
): number {
  let score = 0;

  // Work style (5 pts)
  if (workStylePref && founderWorkStyle) {
    if (workStylePref.toLowerCase() === founderWorkStyle.toLowerCase()) {
      score += 5;
    }
  } else {
    score += 2.5; // partial credit when unknown
  }

  // Culture value overlap (5 pts proportional)
  if (cultureValues.length > 0 && strengths.length > 0) {
    const sLower = strengths.map((s) => s.toLowerCase());
    const cvLower = cultureValues.map((cv) => cv.toLowerCase());
    const overlaps = cvLower.filter((cv) =>
      sLower.some((s) => s.includes(cv) || cv.includes(s))
    );
    score += (overlaps.length / cultureValues.length) * 5;
  } else {
    score += 2.5;
  }

  return Math.min(10, Math.round(score * 10) / 10);
}

/**
 * Returns true if the candidate hits one of the founder's deal-breakers.
 * Checks work style conflicts and junior-level flags.
 */
export function hasDealBreaker(
  candidateLevel: string | null,
  workStylePref: string | null,
  dealBreakers: string[]
): boolean {
  if (!dealBreakers.length) return false;

  const dbText = dealBreakers.join(" ").toLowerCase();

  // Work style conflict (e.g. founder says "no remote", candidate wants remote)
  if (workStylePref) {
    const ws = workStylePref.toLowerCase();
    if (dbText.includes(`no ${ws}`) || dbText.includes(`not ${ws}`)) return true;
  }

  // Experience level conflict (e.g. "no junior", "no entry level")
  if (candidateLevel) {
    const lvl = candidateLevel.toLowerCase();
    if (dbText.includes(`no ${lvl}`)) return true;
    if (lvl === "junior" && (dbText.includes("no junior") || dbText.includes("no entry"))) return true;
  }

  return false;
}
