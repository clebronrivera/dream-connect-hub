// Branded email shell: paw logo header on red, white content card, branded footer.
// All six existing edge functions and all new templates wrap their body with wrap().

import { BRAND, COLORS, FONT_STACK, PAW_LOGO_SVG } from "./brand.ts";
import { escape } from "./components.ts";

interface WrapOptions {
  previewText?: string; // hidden preheader visible in mailbox preview panes
  bodyHtml: string;
}

export function wrap({ previewText, bodyHtml }: WrapOptions): string {
  const preheader = previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(previewText)}</div>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <title>${escape(BRAND.name)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bgTint};font-family:${FONT_STACK};">
${preheader}
<table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background:${COLORS.bgTint};">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" cellspacing="0" cellpadding="0" width="600" style="max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background:${COLORS.primary};padding:20px 24px;border-radius:10px 10px 0 0;" align="left">
            <table role="presentation" cellspacing="0" cellpadding="0">
              <tr>
                <td style="vertical-align:middle;padding-right:12px;">${PAW_LOGO_SVG}</td>
                <td style="vertical-align:middle;">
                  <div style="font-family:${FONT_STACK};color:#ffffff;font-size:20px;font-weight:700;line-height:1;">${escape(BRAND.name)}</div>
                  <div style="font-family:${FONT_STACK};color:rgba(255,255,255,0.85);font-size:12px;margin-top:4px;">${escape(BRAND.descriptor)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BODY CARD -->
        <tr>
          <td style="background:${COLORS.bgCard};padding:28px 24px;border-left:1px solid ${COLORS.border};border-right:1px solid ${COLORS.border};">
            ${bodyHtml}
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:${COLORS.bgCard};padding:18px 24px 24px 24px;border:1px solid ${COLORS.border};border-top:1px solid ${COLORS.border};border-radius:0 0 10px 10px;font-family:${FONT_STACK};font-size:12px;color:${COLORS.muted};line-height:1.6;">
            <div style="border-top:2px solid ${COLORS.primary};padding-top:14px;">
              <div style="color:${COLORS.foreground};font-weight:600;margin-bottom:4px;">${escape(BRAND.name)} — ${escape(BRAND.descriptor)}</div>
              <div><a href="mailto:${BRAND.email}" style="color:${COLORS.muted};text-decoration:none;">${escape(BRAND.email)}</a> · ${escape(BRAND.phone)}</div>
              <div>${escape(BRAND.locations)}</div>
              <div style="margin-top:10px;"><a href="${BRAND.website}" style="color:${COLORS.primary};text-decoration:none;">${escape(BRAND.website)}</a></div>
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
