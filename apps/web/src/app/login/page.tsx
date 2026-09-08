import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { callbackUrl } = await searchParams;

  return (
    <AuthCard
      title="Welcome back"
      description="Log in to your Watchtower account"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[var(--color-brand-cyan)] underline underline-offset-2">
            Sign up free
          </Link>
        </>
      }
    >
      <LoginForm callbackUrl={callbackUrl ?? "/dashboard"} />
    </AuthCard>
  );
}
