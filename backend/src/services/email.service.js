import nodemailer from "nodemailer";
import {
  APP_BASE_URL,
  EMAIL_FROM,
  EMAIL_VERIFICATION_TOKEN_TTL_MINUTES,
  SMTP_HOST,
  SMTP_PASS,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
} from "../config/env.js";

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  const options = {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE || SMTP_PORT === 465,
  };

  if (SMTP_USER) {
    options.auth = { user: SMTP_USER, pass: SMTP_PASS };
  }

  transporter = nodemailer.createTransport(options);
  return transporter;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const isEmailConfigured = () => Boolean(SMTP_HOST);

export const buildVerificationUrl = (token) => {
  const baseUrl = APP_BASE_URL.replace(/\/+$/, "");
  return `${baseUrl}/?verifyEmail=${encodeURIComponent(token)}`;
};

export const buildVerificationEmail = ({ name, verificationUrl }) => {
  const safeName = escapeHtml(name || "there");
  const safeUrl = escapeHtml(verificationUrl);
  const expiryMinutes = EMAIL_VERIFICATION_TOKEN_TTL_MINUTES;

  const subject = "Verify your PassItOn email address";

  const text = [
    `Hi ${name || "there"},`,
    "",
    "Thanks for joining PassItOn. Verify your email address to activate your account:",
    verificationUrl,
    "",
    `This link expires in ${expiryMinutes} minutes. If you did not create an account, you can ignore this email.`,
    "",
    "— The PassItOn team",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f7f5f0;font-family:Arial,Helvetica,sans-serif;color:#252a26;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 8px 30px rgba(16,37,28,0.12);">
            <tr>
              <td style="background:#e4efca;padding:26px 32px;">
                <span style="display:inline-block;background:#e1f25b;border-radius:50%;width:30px;height:30px;line-height:30px;text-align:center;font-size:18px;color:#1c3329;">↗</span>
                <span style="font-size:23px;font-weight:700;letter-spacing:-1px;color:#1c3329;margin-left:8px;">pass<span style="color:#d66c43;">it</span>on</span>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 32px 12px;">
                <h1 style="margin:0 0 14px;font-size:26px;line-height:1.2;color:#1d4937;">Verify your email</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4f5f55;">Hi ${safeName},</p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4f5f55;">
                  Thanks for joining PassItOn, the campus secondhand marketplace. Confirm your email address to finish creating your account.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="background:#1e4937;border-radius:5px;">
                      <a href="${safeUrl}" style="display:inline-block;padding:14px 24px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Verify my email</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#6c8062;">
                  This link expires in <strong>${expiryMinutes} minutes</strong>.
                </p>
                <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#6c8062;">
                  If the button does not work, copy and paste this address into your browser:<br />
                  <a href="${safeUrl}" style="color:#d56640;word-break:break-all;">${safeUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 30px;border-top:1px solid #edf0ec;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#7b887f;">
                  If you did not create a PassItOn account, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
};

export const sendVerificationEmail = async ({ to, name, verificationUrl }) => {
  const { subject, text, html } = buildVerificationEmail({ name, verificationUrl });

  if (!isEmailConfigured()) {
    console.log(`[email:dev] Verification link for ${to}: ${verificationUrl}`);
    return { delivered: false, preview: true };
  }

  const info = await getTransporter().sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    text,
    html,
  });

  return { delivered: true, messageId: info.messageId };
};
