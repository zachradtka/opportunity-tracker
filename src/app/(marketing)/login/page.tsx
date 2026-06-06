import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { getEnabledProviders } from "@/lib/auth";
import { getOptionalSession, isAuthEnabled } from "@/lib/auth-optional";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  signInWithProviderAction,
  signInWithEmailAction,
} from "@/lib/actions/login";
import { GitHubIcon, GoogleIcon, LinkedInIcon } from "./provider-icons";
import { EmailSubmitButton } from "./email-submit-button";

export const metadata: Metadata = {
  title: "Sign in — NextOpp",
  description: "Sign in to your NextOpp account",
};

const errorMessages: Record<string, string> = {
  AccessDenied: "This account isn't allowed to sign in.",
  OAuthAccountNotLinked:
    "An account with this email already exists. Sign in with the provider you used originally.",
  Verification:
    "That sign-in link has expired or already been used. Request a new one below.",
  Configuration:
    "Sign-in is misconfigured. Contact the site administrator.",
  RateLimited:
    "Too many sign-in links were requested. Wait a few minutes before trying again.",
};

function getErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  return errorMessages[code] ?? "Something went wrong signing you in. Try again.";
}

interface PageProps {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
    type?: string;
  }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  if (!isAuthEnabled()) {
    redirect("/opportunities");
  }
  const session = await getOptionalSession();
  if (session?.user) {
    redirect("/opportunities");
  }

  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/opportunities";
  const errorMessage = getErrorMessage(params.error);
  const isVerified = params.type === "email";

  const enabled = getEnabledProviders();
  const hasOAuth = enabled.github || enabled.google || enabled.linkedin;
  const hasAnyProvider = hasOAuth || enabled.resend;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12 sm:py-16 lg:py-24">
      <div className="w-full rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
        {isVerified ? <VerifiedState /> : (
          <SignInForms
            enabled={enabled}
            hasOAuth={hasOAuth}
            hasAnyProvider={hasAnyProvider}
            errorMessage={errorMessage}
            callbackUrl={callbackUrl}
          />
        )}
      </div>
    </div>
  );
}

function VerifiedState() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Mail className="size-6" />
      </div>
      <h1 className="text-xl font-semibold">Check your email</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We sent you a sign-in link. Open it on this device to finish signing
        in.
      </p>
    </div>
  );
}

function SignInForms({
  enabled,
  hasOAuth,
  hasAnyProvider,
  errorMessage,
  callbackUrl,
}: {
  enabled: ReturnType<typeof getEnabledProviders>;
  hasOAuth: boolean;
  hasAnyProvider: boolean;
  errorMessage: string | null;
  callbackUrl: string;
}) {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold sm:text-2xl">
          Sign in to NextOpp
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Continue to your interview pipeline
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      )}

      {!hasAnyProvider && (
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          No sign-in methods are configured. See the README for setup
          instructions.
        </div>
      )}

      {hasOAuth && (
        <div className="flex flex-col gap-2">
          {enabled.github && (
            <ProviderButton
              provider="github"
              label="GitHub"
              callbackUrl={callbackUrl}
              icon={<GitHubIcon className="size-4" />}
            />
          )}
          {enabled.google && (
            <ProviderButton
              provider="google"
              label="Google"
              callbackUrl={callbackUrl}
              icon={<GoogleIcon className="size-4" />}
            />
          )}
          {enabled.linkedin && (
            <ProviderButton
              provider="linkedin"
              label="LinkedIn"
              callbackUrl={callbackUrl}
              icon={<LinkedInIcon className="size-4" />}
            />
          )}
        </div>
      )}

      {hasOAuth && enabled.resend && (
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            or
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}

      {enabled.resend && (
        <form action={signInWithEmailAction} className="flex flex-col gap-3">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className="h-10"
            />
          </div>
          <EmailSubmitButton />
        </form>
      )}
    </>
  );
}

function ProviderButton({
  provider,
  label,
  callbackUrl,
  icon,
}: {
  provider: string;
  label: string;
  callbackUrl: string;
  icon: React.ReactNode;
}) {
  return (
    <form action={signInWithProviderAction}>
      <input type="hidden" name="provider" value={provider} />
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <Button
        type="submit"
        variant="outline"
        className="h-10 w-full justify-center gap-2"
      >
        {icon}
        Continue with {label}
      </Button>
    </form>
  );
}
