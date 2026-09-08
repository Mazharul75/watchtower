"use server";

import { signIn, signOut } from "@/auth";
import { performCredentialsLogin } from "@/lib/credentials-login";

export interface FormActionState {
  error: string | null;
  success: boolean;
}

function messageFor(error: "INVALID" | "EMAIL_NOT_VERIFIED" | "RATE_LIMITED" | "SUSPENDED"): string {
  switch (error) {
    case "EMAIL_NOT_VERIFIED":
      return "Please verify your email address before logging in. Check your inbox, or request a new verification link.";
    case "RATE_LIMITED":
      return "Too many login attempts. Please wait a few minutes and try again.";
    case "SUSPENDED":
      return "This account has been suspended. Contact your administrator for details.";
    default:
      return "Invalid email or password.";
  }
}

/**
 * Verification + Session-row creation happen in performCredentialsLogin
 * (see its comment for why Auth.js's own Credentials sign-in can't be used
 * with database sessions). Returning success and letting the client
 * navigate (see LoginForm) means the follow-up request to /dashboard is a
 * normal browser request that carries the cookie just set on this response.
 */
export async function loginAction(_prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const result = await performCredentialsLogin(email, password);
  if (!result.ok) {
    return { error: messageFor(result.error), success: false };
  }
  return { error: null, success: true };
}

export async function oauthSignInAction(provider: "github" | "google", callbackUrl = "/dashboard") {
  // GitHub/Google go through Auth.js's own adapter-backed flow, which DOES
  // support database sessions — only the Credentials path needed the
  // workaround above.
  await signIn(provider, { redirectTo: callbackUrl });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
