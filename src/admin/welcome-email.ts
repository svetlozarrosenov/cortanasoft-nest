/**
 * Welcome имейл към нов потребител. Дизайнът (хедър, кутия с данните за вход,
 * бутон, футър) е фиксиран; редактируеми са заглавието и текстовете около
 * кутията — само за конкретното изпращане, нищо не се пази.
 *
 * Плейсхолдъри в редактируемите части: {{firstName}}, {{lastName}}, {{email}},
 * {{password}}, {{companyName}}, {{roleName}}, {{loginUrl}}. Паролата се
 * замества единствено на сървъра при изпращане; в прегледа е маскирана.
 */

export const WELCOME_EMAIL_PLACEHOLDERS = [
  'firstName',
  'lastName',
  'email',
  'password',
  'companyName',
  'roleName',
  'loginUrl',
] as const;

export const LOGIN_URL = 'https://cortanasoft.com/login';
export const PASSWORD_MASK = '••••••••';

export interface WelcomeEmailParts {
  subject: string;
  greeting: string; // обикновен текст
  intro: string; // HTML (rich text)
  note: string; // HTML (rich text), жълтата бележка под кутията
}

export interface WelcomeEmailVars {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyName: string;
  roleName: string;
  loginUrl?: string;
}

export const WELCOME_EMAIL_DEFAULTS: WelcomeEmailParts = {
  subject: 'Добре дошли в CortanaSoft',
  greeting: 'Здравейте, {{firstName}}!',
  intro:
    '<p>Вашият акаунт в <strong>cortanasoft.com</strong> е готов за използване. По-долу ще намерите данните за вход в платформата.</p>',
  note: '<p>&#128274; <strong>Препоръчваме Ви да смените паролата си при първо влизане.</strong></p>',
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Минимална дезинфекция на rich text от админа: без скриптове и inline handlers
const stripUnsafe = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');

function fill(text: string, vars: WelcomeEmailVars, htmlEscape: boolean): string {
  const map: Record<string, string> = {
    firstName: vars.firstName,
    lastName: vars.lastName,
    email: vars.email,
    password: vars.password,
    companyName: vars.companyName,
    roleName: vars.roleName,
    loginUrl: vars.loginUrl || LOGIN_URL,
  };
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (full, key) =>
    key in map ? (htmlEscape ? escapeHtml(map[key]) : map[key]) : full,
  );
}

/** Само подадените части заместват стандартните; празен низ = стандартна. */
export function mergeWelcomeEmailParts(
  parts?: Partial<WelcomeEmailParts> | null,
): WelcomeEmailParts {
  return {
    subject: parts?.subject?.trim() || WELCOME_EMAIL_DEFAULTS.subject,
    greeting: parts?.greeting?.trim() || WELCOME_EMAIL_DEFAULTS.greeting,
    intro: parts?.intro?.trim() || WELCOME_EMAIL_DEFAULTS.intro,
    note: parts?.note?.trim() || WELCOME_EMAIL_DEFAULTS.note,
  };
}

export function renderWelcomeEmail(
  parts: WelcomeEmailParts,
  vars: WelcomeEmailVars,
): { subject: string; html: string } {
  const loginUrl = vars.loginUrl || LOGIN_URL;
  const subject = fill(parts.subject, vars, false);
  const greeting = fill(escapeHtml(parts.greeting), vars, true);
  const intro = fill(stripUnsafe(parts.intro), vars, true);
  const note = fill(stripUnsafe(parts.note), vars, true);
  const html = `
<!DOCTYPE html>
<html lang="bg">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Добре дошли в CortanaSoft</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">ERP &bull; CRM &bull; HR &bull; Управление на проекти</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 20px;color:#18181b;font-size:22px;font-weight:600;">${greeting}</h2>
              <div style="margin:0 0 24px;color:#3f3f46;font-size:15px;line-height:1.7;">${intro}</div>
              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#f8f7ff;border:1px solid #e0e0ff;border-radius:10px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 4px;color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Данни за вход</p>
                    <table cellpadding="0" cellspacing="0" style="margin-top:12px;">
                      <tr>
                        <td style="padding:6px 0;color:#71717a;font-size:14px;font-weight:600;width:80px;">URL:</td>
                        <td style="padding:6px 0;color:#18181b;font-size:14px;"><a href="${loginUrl}" style="color:#4f46e5;text-decoration:none;font-weight:500;">${loginUrl}</a></td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#71717a;font-size:14px;font-weight:600;width:80px;">Email:</td>
                        <td style="padding:6px 0;color:#18181b;font-size:14px;">${escapeHtml(vars.email)}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#71717a;font-size:14px;font-weight:600;width:80px;">Парола:</td>
                        <td style="padding:6px 0;color:#18181b;font-size:15px;font-weight:700;font-family:'Courier New',monospace;letter-spacing:0.5px;">${escapeHtml(vars.password)}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#71717a;font-size:14px;font-weight:600;width:80px;">Роля:</td>
                        <td style="padding:6px 0;color:#18181b;font-size:14px;">${escapeHtml(vars.roleName)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;background-color:#fef9c3;border:1px solid #fde68a;border-radius:8px;">
                <tr>
                  <td style="padding:14px 20px;color:#92400e;font-size:13px;line-height:1.6;">${note}</td>
                </tr>
              </table>
              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:10px;">
                    <a href="${loginUrl}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      Вход в платформата &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#fafafa;padding:24px 40px;border-top:1px solid #e4e4e7;">
              <p style="margin:0 0 4px;color:#71717a;font-size:13px;text-align:center;">
                CortanaSoft &mdash; Вашият бизнес, една платформа.
              </p>
              <p style="margin:0;color:#a1a1aa;font-size:12px;text-align:center;">
                &copy; ${new Date().getFullYear()} CortanaSoft. Всички права запазени.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return { subject, html };
}
