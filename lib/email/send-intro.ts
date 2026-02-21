import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "hello@foundermatch.com";

interface IntroParams {
  founderName: string;
  founderEmail: string;
  companyName: string;
  companyDescription: string | null;
  roleTitle: string | null;
  roleDescription: string | null;
  candidateName: string;
  candidateEmail: string;
  candidateExperienceYears: number | null;
  candidateExperienceLevel: string | null;
  candidateSkills: string[];
  candidateSummary: string | null;
  linkedinUrl: string | null;
}

export async function sendIntroEmails(params: IntroParams) {
  const {
    founderName,
    founderEmail,
    companyName,
    companyDescription,
    roleTitle,
    roleDescription,
    candidateName,
    candidateEmail,
    candidateExperienceYears,
    candidateExperienceLevel,
    candidateSkills,
    candidateSummary,
    linkedinUrl,
  } = params;

  const role = roleTitle ?? "an open role";
  const topSkills = candidateSkills.slice(0, 6).join(", ");
  const level = candidateExperienceLevel
    ? candidateExperienceLevel.charAt(0).toUpperCase() + candidateExperienceLevel.slice(1)
    : null;
  const yearsStr = candidateExperienceYears
    ? `${candidateExperienceYears} year${candidateExperienceYears !== 1 ? "s" : ""} of experience`
    : null;

  // ── Email to founder ─────────────────────────────────────────────────────
  const founderHtml = `
<p>Hi ${founderName},</p>

<p>You've connected with <strong>${candidateName}</strong> for your <strong>${role}</strong> role at ${companyName}. Here's a quick overview:</p>

<p>
  ${[level, yearsStr].filter(Boolean).join(" &middot; ")}${topSkills ? `<br>Skills: ${topSkills}` : ""}${candidateSummary ? `<br><br>${candidateSummary}` : ""}
</p>

<p>
  Reach out directly to move things forward:<br>
  <a href="mailto:${candidateEmail}">${candidateEmail}</a>${linkedinUrl ? `<br><a href="${linkedinUrl}">LinkedIn profile</a>` : ""}
</p>

<p>Good luck!</p>
<p style="color:#888;font-size:12px;">— The FounderMatch team</p>
  `.trim();

  // ── Email to candidate ───────────────────────────────────────────────────
  const candidateHtml = `
<p>Hi ${candidateName},</p>

<p><strong>${founderName}</strong> from <strong>${companyName}</strong> wants to connect with you about their <strong>${role}</strong> position.</p>

${companyDescription ? `<p>${companyDescription}</p>` : ""}

${roleDescription ? `<p><strong>What they're building and who they need:</strong><br>${roleDescription}</p>` : ""}

<p>
  Reach out directly to get the conversation started:<br>
  <a href="mailto:${founderEmail}">${founderEmail}</a>
</p>

<p>Good luck!</p>
<p style="color:#888;font-size:12px;">— The FounderMatch team</p>
  `.trim();

  const [r1, r2] = await Promise.all([
    resend.emails.send({
      from: FROM,
      to: founderEmail,
      subject: `You connected with ${candidateName}!`,
      html: founderHtml,
    }),
    resend.emails.send({
      from: FROM,
      to: candidateEmail,
      subject: `A startup wants to meet you — ${companyName}`,
      html: candidateHtml,
    }),
  ]);

  if (r1.error) console.error("Intro email to founder failed:", r1.error);
  if (r2.error) console.error("Intro email to candidate failed:", r2.error);
}
