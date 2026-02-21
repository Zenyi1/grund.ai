"use client";

import { useActionState, useState } from "react";
import { completeOnboarding } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "founder" | "candidate" | null;

export default function OnboardingPage() {
  const [role, setRole] = useState<Role>(null);
  const [state, formAction, isPending] = useActionState(completeOnboarding, null);

  return (
    <div className="w-full max-w-lg space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to FounderMatch</h1>
        <p className="mt-2 text-gray-500">Let&apos;s set up your profile. Who are you?</p>
      </div>

      {/* Role selector */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setRole("founder")}
          className={cn(
            "flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-left transition-all hover:bg-gray-50",
            role === "founder"
              ? "border-gray-900 bg-gray-50"
              : "border-gray-200"
          )}
        >
          <Building2 className="h-8 w-8 text-gray-700" />
          <div>
            <p className="font-semibold text-gray-900">I&apos;m a Founder</p>
            <p className="text-sm text-gray-500">I&apos;m hiring for my startup</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setRole("candidate")}
          className={cn(
            "flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-left transition-all hover:bg-gray-50",
            role === "candidate"
              ? "border-gray-900 bg-gray-50"
              : "border-gray-200"
          )}
        >
          <User className="h-8 w-8 text-gray-700" />
          <div>
            <p className="font-semibold text-gray-900">I&apos;m a Candidate</p>
            <p className="text-sm text-gray-500">I&apos;m looking for a role</p>
          </div>
        </button>
      </div>

      {/* Profile form — shown after role selected */}
      {role && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {role === "founder" ? "Tell us about your company" : "Tell us about yourself"}
            </CardTitle>
            <CardDescription>
              {role === "founder"
                ? "This helps candidates understand your startup."
                : "This gets you into the interview queue."}
            </CardDescription>
          </CardHeader>

          <form action={formAction}>
            <input type="hidden" name="role" value={role} />

            <CardContent className="space-y-4">
              {state?.error && (
                <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {state.error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  placeholder="Jane Smith"
                  required
                />
              </div>

              {role === "founder" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company name</Label>
                    <Input
                      id="company_name"
                      name="company_name"
                      placeholder="Acme Inc."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_description">
                      What does your company do?{" "}
                      <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="company_description"
                      name="company_description"
                      placeholder="We build AI tools for…"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">
                      Website{" "}
                      <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="website"
                      name="website"
                      type="url"
                      placeholder="https://yourcompany.com"
                    />
                  </div>
                </>
              )}

              {role === "candidate" && (
                <div className="space-y-2">
                  <Label htmlFor="linkedin_url">
                    LinkedIn URL{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="linkedin_url"
                    name="linkedin_url"
                    type="url"
                    placeholder="https://linkedin.com/in/yourname"
                  />
                </div>
              )}
            </CardContent>

            <CardFooter>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Saving…" : "Continue"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  );
}
