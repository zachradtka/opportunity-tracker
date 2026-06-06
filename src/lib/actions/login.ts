"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { checkMagicLinkRateLimit } from "@/lib/rate-limit/magic-link";

export async function signInWithProviderAction(formData: FormData) {
  const provider = formData.get("provider")?.toString();
  const callbackUrl = formData.get("callbackUrl")?.toString() || "/opportunities";
  if (!provider) return;
  await signIn(provider, { redirectTo: callbackUrl });
}

export async function signInWithEmailAction(formData: FormData) {
  const email = formData.get("email")?.toString().trim();
  const callbackUrl = formData.get("callbackUrl")?.toString() || "/opportunities";
  if (!email) return;
  const rateLimit = await checkMagicLinkRateLimit(email);
  if (!rateLimit.allowed) {
    redirect(
      `/login?error=RateLimited&callbackUrl=${encodeURIComponent(callbackUrl)}`
    );
  }
  await signIn("resend", { email, redirectTo: callbackUrl });
}
