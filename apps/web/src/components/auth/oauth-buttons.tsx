"use client";

import { useTransition } from "react";
import { oauthSignInAction } from "@/app/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/alert";

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-1.94c-3.2.7-3.87-1.54-3.87-1.54-.53-1.33-1.29-1.69-1.29-1.69-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.24 2.75.12 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .3.2.66.79.55A10.97 10.97 0 0 0 23.5 12c0-6.35-5.15-11.5-11.5-11.5Z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.85h5.42c-.24 1.4-1.7 4.1-5.42 4.1-3.26 0-5.92-2.7-5.92-6.05s2.66-6.05 5.92-6.05c1.86 0 3.1.79 3.81 1.47l2.6-2.5C16.86 3.3 14.7 2.3 12 2.3 6.86 2.3 2.7 6.5 2.7 11.6s4.16 9.3 9.3 9.3c5.37 0 8.93-3.77 8.93-9.08 0-.61-.07-1.08-.15-1.55H12Z" />
    </svg>
  );
}

export function OAuthButtons({ callbackUrl = "/dashboard" }: { callbackUrl?: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="secondary"
        disabled={isPending}
        onClick={() => startTransition(() => oauthSignInAction("github", callbackUrl))}
      >
        {isPending ? <Spinner /> : <GitHubIcon />}
        Continue with GitHub
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={isPending}
        onClick={() => startTransition(() => oauthSignInAction("google", callbackUrl))}
      >
        {isPending ? <Spinner /> : <GoogleIcon />}
        Continue with Google
      </Button>
    </div>
  );
}
