// Reusable HTML-string helpers for emails. Inline styles only (email clients
// strip <style> blocks aggressively). All user-supplied strings MUST pass
// through escape() before being injected.

import { COLORS, FONT_STACK } from "./brand.ts";

export function escape(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function button(label: string, href: string): string {
  return `<div style="margin:24px 0;text-align:center;">
  <a href="${href}" style="display:inline-block;padding:14px 28px;background:${COLORS.primary};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;font-family:${FONT_STACK};">
    ${escape(label)}
  </a>
</div>`;
}

export function row(label: string, value: string): string {
  return `<tr>
  <td style="padding:10px 14px;border:1px solid ${COLORS.border};background:#FAFAFA;font-weight:600;width:40%;">${escape(label)}</td>
  <td style="padding:10px 14px;border:1px solid ${COLORS.border};">${escape(value)}</td>
</tr>`;
}

export function table(rows: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;margin:16px 0;font-family:${FONT_STACK};font-size:14px;color:${COLORS.foreground};">
  ${rows}
</table>`;
}

export function callout(text: string): string {
  return `<div style="margin:16px 0;padding:12px 14px;background:${COLORS.calloutBg};border-left:3px solid ${COLORS.calloutBorder};border-radius:4px;">
  <p style="margin:0;white-space:pre-wrap;font-family:${FONT_STACK};font-size:14px;color:${COLORS.foreground};">${escape(text)}</p>
</div>`;
}

export function divider(): string {
  return `<hr style="border:none;border-top:1px solid ${COLORS.border};margin:24px 0;" />`;
}

export function paragraph(text: string): string {
  return `<p style="margin:0 0 14px 0;font-family:${FONT_STACK};font-size:15px;line-height:1.55;color:${COLORS.foreground};">${escape(text)}</p>`;
}

// For content that is already safe HTML (e.g., pre-built <strong>...</strong>).
// Use sparingly. Never pass unescaped user input here.
export function rawParagraph(html: string): string {
  return `<p style="margin:0 0 14px 0;font-family:${FONT_STACK};font-size:15px;line-height:1.55;color:${COLORS.foreground};">${html}</p>`;
}

export function heading(text: string, level: 1 | 2 | 3 = 2): string {
  const sizes = { 1: "22px", 2: "19px", 3: "16px" };
  return `<h${level} style="margin:0 0 12px 0;font-family:${FONT_STACK};font-size:${sizes[level]};font-weight:700;color:${COLORS.foreground};">${escape(text)}</h${level}>`;
}

// Strip HTML tags for plain-text fallback generation.
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|tr|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
