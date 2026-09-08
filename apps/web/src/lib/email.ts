import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";

/**
 * Three-tier email strategy, selected automatically by which env vars are
 * present — no code change needed between local dev and production:
 *
 *  1. RESEND_API_KEY set        -> Resend (free tier: 3,000 emails/month)
 *  2. SMTP_HOST set             -> any SMTP provider (self-hosted / Gmail / Zoho free tier)
 *  3. neither set (local dev)   -> a disposable Ethereal test inbox, created
 *     automatically on first send. Nothing is delivered to a real address;
 *     the preview URL is printed to the server console so you can open the
 *     email and click the real verification/reset link during development.
 */

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let etherealTransporter: Transporter | null = null;

async function getEtherealTransporter(): Promise<Transporter> {
  if (etherealTransporter) return etherealTransporter;
  const testAccount = await nodemailer.createTestAccount();
  etherealTransporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  return etherealTransporter;
}

export async function sendEmail(input: SendEmailInput): Promise<{ previewUrl?: string }> {
  const from = process.env.EMAIL_FROM ?? "Watchtower <onboarding@watchtower.dev>";

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (result.error) {
      throw new Error(`Resend send failed: ${result.error.message}`);
    }
    return {};
  }

  if (process.env.SMTP_HOST) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
    await transporter.sendMail({ from, to: input.to, subject: input.subject, html: input.html, text: input.text });
    return {};
  }

  // Local dev fallback.
  const transporter = await getEtherealTransporter();
  const info = await transporter.sendMail({ from, to: input.to, subject: input.subject, html: input.html, text: input.text });
  const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
  if (previewUrl) {
    console.log(`\n[dev email] "${input.subject}" -> ${input.to}\n  Preview: ${previewUrl}\n`);
  }
  return { previewUrl };
}

function emailShell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0B0F1A;font-family:Inter,system-ui,sans-serif;color:#E5E7EB;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
      <tr><td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:16px;overflow:hidden;border:1px solid rgba(148,163,184,0.16);">
          <tr><td style="padding:28px 32px 0 32px;">
            <div style="font-weight:700;font-size:20px;background:linear-gradient(115deg,#6366F1,#8B5CF6,#22D3EE);-webkit-background-clip:text;background-clip:text;color:transparent;">Watchtower</div>
          </td></tr>
          <tr><td style="padding:24px 32px 32px 32px;">
            <h1 style="font-size:18px;margin:0 0 12px 0;color:#E5E7EB;">${title}</h1>
            ${bodyHtml}
          </td></tr>
        </table>
        <p style="color:#64748B;font-size:12px;margin-top:16px;">Watchtower &mdash; AI engineering memory for GitHub repos.</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function verificationEmailTemplate(link: string) {
  const html = emailShell(
    "Verify your email",
    `<p style="color:#94A3B8;font-size:14px;line-height:1.6;">Confirm this address to finish creating your Watchtower account. This link expires in 24 hours.</p>
     <a href="${link}" style="display:inline-block;margin-top:16px;padding:12px 20px;border-radius:10px;background:linear-gradient(115deg,#6366F1,#8B5CF6,#22D3EE);color:#0B0F1A;font-weight:600;text-decoration:none;font-size:14px;">Verify email address</a>
     <p style="color:#64748B;font-size:12px;margin-top:20px;word-break:break-all;">Or paste this link: ${link}</p>`,
  );
  const text = `Verify your Watchtower account: ${link} (expires in 24 hours)`;
  return { html, text };
}

export function passwordResetEmailTemplate(link: string) {
  const html = emailShell(
    "Reset your password",
    `<p style="color:#94A3B8;font-size:14px;line-height:1.6;">We received a request to reset your Watchtower password. This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
     <a href="${link}" style="display:inline-block;margin-top:16px;padding:12px 20px;border-radius:10px;background:linear-gradient(115deg,#6366F1,#8B5CF6,#22D3EE);color:#0B0F1A;font-weight:600;text-decoration:none;font-size:14px;">Reset password</a>
     <p style="color:#64748B;font-size:12px;margin-top:20px;word-break:break-all;">Or paste this link: ${link}</p>`,
  );
  const text = `Reset your Watchtower password: ${link} (expires in 15 minutes)`;
  return { html, text };
}
