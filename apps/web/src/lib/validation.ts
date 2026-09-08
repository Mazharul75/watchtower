import { z } from "zod";

// Shared across client-side forms (immediate feedback) and API route handlers
// (the check that actually matters — never trust client-side validation alone).

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username must be under 32 characters")
  .regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, hyphens and underscores");

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password must be under 128 characters");

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
  email: emailSchema,
});

export const createOrgSchema = z.object({
  name: z.string().trim().min(2, "Organization name must be at least 2 characters").max(64),
});
