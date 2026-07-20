import nodemailer from "nodemailer";

type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const MAIL_FROM = "admin@thaimyheat.com";
const NO_REPLY = "no-reply@thaimyheat.com";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass || !Number.isFinite(port)) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendEmail(payload: MailPayload) {
  const transport = createTransport();

  if (!transport) {
    throw new Error("SMTP is not configured.");
  }

  await transport.sendMail({
    from: `Thai My Heart <${MAIL_FROM}>`,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    replyTo: NO_REPLY,
    headers: {
      "X-Auto-Response-Suppress": "All",
      Precedence: "bulk",
    },
  });
}

export async function sendVerificationCodeEmail(email: string, code: string) {
  const subject = "Thai My Heart verification code";
  const text = [
    "Your Thai My Heart verification code:",
    code,
    "",
    "This code expires in 10 minutes.",
    "For your security, do not share this code.",
    "",
    "This mailbox is not monitored. Please do not reply.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
      <h2 style="margin:0 0 12px 0;">Verify your email</h2>
      <p style="margin:0 0 12px 0;">Use this 4-digit code to complete your Thai My Heart signup:</p>
      <div style="font-size:30px;font-weight:700;letter-spacing:6px;margin:8px 0 12px 0;color:#be123c;">${code}</div>
      <p style="margin:0 0 12px 0;">This code expires in 10 minutes.</p>
      <p style="margin:0;color:#475569;font-size:13px;">This mailbox is not monitored. Please do not reply.</p>
    </div>
  `;

  await sendEmail({ to: email, subject, text, html });
}

export async function sendWelcomeEmail(email: string, userName: string) {
  const subject = "Welcome to Thai My Heart";
  const text = [
    `Hi ${userName},`,
    "",
    "Welcome to Thai My Heart.",
    "Your account is now verified and ready.",
    "",
    "What to do next:",
    "- Complete your profile details",
    "- Upload clear profile photos",
    "- Start browsing members and messaging",
    "",
    "Thank you for joining us.",
    "Thai My Heart Team",
    "",
    "This mailbox is not monitored. Please do not reply.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin:0 0 12px 0;">Welcome to Thai My Heart, ${userName}</h2>
      <p style="margin:0 0 12px 0;">Your account is verified and ready to go.</p>
      <p style="margin:0 0 8px 0;">Here are your next steps:</p>
      <ul style="margin:0 0 12px 20px;padding:0;">
        <li>Complete your profile details</li>
        <li>Upload clear profile photos</li>
        <li>Start browsing members and messaging</li>
      </ul>
      <p style="margin:0 0 12px 0;">Thank you for joining Thai My Heart.</p>
      <p style="margin:0;color:#475569;font-size:13px;">This mailbox is not monitored. Please do not reply.</p>
    </div>
  `;

  await sendEmail({ to: email, subject, text, html });
}

export async function sendPasswordResetEmail(email: string, userName: string, resetLink: string) {
  const subject = "Reset your Thai My Heart password";
  const text = [
    `Hi ${userName},`,
    "",
    "We received a request to reset your Thai My Heart password.",
    "Use this link to set a new password:",
    resetLink,
    "",
    "This link expires in 30 minutes and can be used only once.",
    "If you did not request this, you can safely ignore this email.",
    "",
    "This mailbox is not monitored. Please do not reply.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin:0 0 12px 0;">Reset your password</h2>
      <p style="margin:0 0 12px 0;">Hi ${userName},</p>
      <p style="margin:0 0 12px 0;">We received a request to reset your Thai My Heart password.</p>
      <p style="margin:0 0 12px 0;">
        <a href="${resetLink}" style="display:inline-block;background:#be123c;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">
          Reset Password
        </a>
      </p>
      <p style="margin:0 0 12px 0;">Or paste this link in your browser:<br/><span style="word-break:break-all;color:#334155;">${resetLink}</span></p>
      <p style="margin:0 0 12px 0;">This link expires in 30 minutes and can be used only once.</p>
      <p style="margin:0;color:#475569;font-size:13px;">If you did not request this, you can ignore this email. This mailbox is not monitored. Please do not reply.</p>
    </div>
  `;

  await sendEmail({ to: email, subject, text, html });
}
