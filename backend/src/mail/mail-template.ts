export interface EmailContent {
  heading: string;
  body: string;
  // Call to action. Its URL is repeated as plain text under the button.
  button?: { label: string; url: string };
  linkFallback: string;
  footer: string;
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

// Inline styles and a table-free single column: the subset of HTML that mail
// clients render consistently.
export function renderEmailHtml(content: EmailContent): string {
  const button = content.button
    ? `<p style="margin:28px 0;">
        <a href="${escapeHtml(content.button.url)}" style="display:inline-block;padding:14px 22px;background:#ffd23f;color:#16130f;border:2px solid #16130f;border-radius:12px;font-weight:bold;text-decoration:none;">${escapeHtml(content.button.label)}</a>
      </p>
      <p style="margin:0 0 6px;font-size:13px;color:#5c564d;">${escapeHtml(content.linkFallback)}</p>
      <p style="margin:0;font-size:13px;word-break:break-all;"><a href="${escapeHtml(content.button.url)}" style="color:#16130f;">${escapeHtml(content.button.url)}</a></p>`
    : '';

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#fff8ea;font-family:Arial,Helvetica,sans-serif;color:#16130f;">
    <div style="max-width:520px;margin:0 auto;padding:28px;background:#ffffff;border:2px solid #16130f;border-radius:16px;">
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;">${escapeHtml(content.heading)}</h1>
      <p style="margin:0;font-size:16px;line-height:1.5;">${escapeHtml(content.body)}</p>
      ${button}
    </div>
    <p style="max-width:520px;margin:16px auto 0;font-size:12px;color:#5c564d;text-align:center;">${escapeHtml(content.footer)}</p>
  </body>
</html>`;
}

export function renderEmailText(content: EmailContent): string {
  const lines = [content.heading, '', content.body];
  if (content.button) {
    lines.push('', `${content.button.label}: ${content.button.url}`);
  }
  lines.push('', content.footer);
  return lines.join('\n');
}
