/**
 * แม่แบบอีเมล (HTML แบบเรียบง่าย ใช้ได้กับทุกโปรแกรมอ่านเมล)
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type EmailContent = {
  heading: string;
  intro: string;
  rows: [label: string, value: string][];
  buttonText: string;
  buttonUrl: string;
};

export function renderEmail(content: EmailContent): { html: string; text: string } {
  const rows = content.rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 12px;color:#6b7280;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>
          <td style="padding:8px 12px;color:#111827">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="th">
  <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Tahoma,Arial,sans-serif">
    <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb">
      <tr><td style="padding:24px 24px 8px">
        <h1 style="margin:0 0 8px;font-size:18px;color:#111827">${escapeHtml(content.heading)}</h1>
        <p style="margin:0;color:#374151;font-size:14px">${escapeHtml(content.intro)}</p>
      </td></tr>
      <tr><td style="padding:8px 12px">
        <table role="presentation" width="100%" style="font-size:14px;border-collapse:collapse">${rows}</table>
      </td></tr>
      <tr><td style="padding:8px 24px 24px">
        <a href="${escapeHtml(content.buttonUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px">${escapeHtml(content.buttonText)}</a>
      </td></tr>
    </table>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px">อีเมลนี้ส่งอัตโนมัติจากระบบ OT กรุณาอย่าตอบกลับ</p>
  </body>
</html>`;

  const text = [
    content.heading,
    "",
    content.intro,
    "",
    ...content.rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `${content.buttonText}: ${content.buttonUrl}`,
  ].join("\n");

  return { html, text };
}
