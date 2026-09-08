"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./button";
import { Spinner } from "./alert";

export function SubmitButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={`w-full ${className}`}>
      {pending ? <Spinner /> : null}
      {pending ? "Please wait…" : children}
    </Button>
  );
}
