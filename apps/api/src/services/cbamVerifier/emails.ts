import { verifierConfig as c, labelledVerifierAnswers, type VerifierAnswers, type VerifierResult } from '@newcarboscan/carbon-engine/cbam-verifier';
export type VerifierLead = {
  requestId: string; fullName: string; companyName: string; email: string; country: string;
  phone: string; consent: true; answers: VerifierAnswers; customsCode: string;
};
export type EmailMessage = { subject: string; html: string; text: string; reply_to?: string };
const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
export function buildVerifierDocuments(lead: VerifierLead, result: VerifierResult, date: string): { report: EmailMessage; internal: EmailMessage } {
  const rows = labelledVerifierAnswers(lead.answers);
  const verdict = c.verdicts[result.verdict].label;
  const summaryText = `${c.email.verdict} : ${verdict}\n${c.email.score} : ${result.score}/100 — ${result.bandLabel}\n${c.email.date} : ${date}`;
  const summaryHtml = `<p><strong>${escape(c.email.verdict)} : ${escape(verdict)}</strong></p><p>${escape(c.email.score)} : ${result.score}/100 — ${escape(result.bandLabel)}</p><p>${escape(c.email.date)} : ${escape(date)}</p>`;
  const answersHtml = `<h2>${escape(c.email.answers)}</h2><dl>${rows.map(row => `<dt><strong>${escape(row.question)}</strong></dt><dd>${escape(row.answer)}</dd>`).join('')}</dl>${lead.customsCode ? `<p>${escape(c.email.customsCode)} : ${escape(lead.customsCode)}</p>` : ''}`;
  const stepsHtml = `<h2>${escape(c.email.nextSteps)}</h2><ol>${result.steps.map(step => `<li>${escape(step)}</li>`).join('')}</ol>`;
  const answersText = rows.map(row => `${row.question}\n${row.answer}`).join('\n\n');
  const footerHtml = `<p>${escape(c.disclaimer)}</p><p><a href="https://carboscan.io/cbam">${escape(c.email.guide)}</a></p><p><a href="https://carboscan.io/demo">${escape(c.email.meeting)}</a></p><p>${escape(c.email.thanks)}</p>`;
  const wrap = (html: string) => `<!doctype html><html lang="fr"><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;color:#173e35;line-height:1.6"><main style="max-width:680px;margin:auto;padding:24px">${html}</main></body></html>`;
  const report = {
    subject: c.email.prospectSubject,
    html: wrap(`<h1>${escape(c.intro.badge)}</h1><p>${escape(c.email.hello)} ${escape(lead.fullName)},</p><p>${escape(c.email.report)}</p>${summaryHtml}<p>${escape(c.verdicts[result.verdict].description)}</p>${answersHtml}${stepsHtml}${result.urgent ? `<p><strong>${escape(c.urgency.text)}</strong></p>` : ''}${footerHtml}`),
    text: `${c.email.hello} ${lead.fullName},\n\n${c.email.report}\n\n${summaryText}\n\n${c.email.answers}\n${answersText}\n${lead.customsCode ? `${c.email.customsCode} : ${lead.customsCode}\n` : ''}\n${c.email.nextSteps}\n${result.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n${c.disclaimer}\nhttps://carboscan.io/cbam\nhttps://carboscan.io/demo\n\n${c.email.thanks}`,
  };
  const contactFields = [[c.form.fullName, lead.fullName], [c.form.company, lead.companyName], [c.form.email, lead.email], [c.form.country, lead.country], [c.form.phone, lead.phone || '—'], [c.email.consent, c.email.yes]];
  const internal = {
    subject: `${c.email.internalSubject} — ${lead.companyName}`,
    reply_to: lead.email,
    html: wrap(`<h1>${escape(c.email.internalIntro)}</h1>${contactFields.map(([label, value]) => `<p><strong>${escape(label)}</strong> : ${escape(value)}</p>`).join('')}${summaryHtml}${answersHtml}${stepsHtml}<p>${escape(c.email.source)} : ${escape(c.path)}</p>`),
    text: `${c.email.internalIntro}\n\n${contactFields.map(([label, value]) => `${label} : ${value}`).join('\n')}\n\n${summaryText}\n\n${answersText}\n\n${result.steps.join('\n')}\n${c.email.source} : ${c.path}`,
  };
  return { report, internal };
}
