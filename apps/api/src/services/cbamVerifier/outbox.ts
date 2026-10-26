import { rawPool } from '../../db.js';
import type { EmailMessage } from './emails.js';
export async function sendResendEmail(input: { id: string; lead_id: string; kind: string; recipient: string; message: EmailMessage }, fetcher: typeof fetch = fetch) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('resend_not_configured');
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(15000),
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `cbam-verifier/${input.lead_id}/${input.kind}` },
    body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL || 'CarboScan <contact@carboscan.io>', to: [input.recipient], ...input.message }),
  });
  // Never log provider response bodies, which can include recipient details.
  if (!response.ok) throw new Error(`resend_http_${response.status}`);
  const body = await response.json() as { id?: string };
  if (!body.id) throw new Error('resend_missing_id');
  return body.id;
}
export async function drainVerifierEmails() {
  if (!process.env.RESEND_API_KEY) return;
  await rawPool.query(`UPDATE cbam_verifier_emails SET status='failed', locked_at=NULL, last_error='delivery_lease_expired' WHERE status='sending' AND attempts >= 6 AND locked_at < now() - interval '5 minutes'`);
  for (let n = 0; n < 10; n += 1) {
    const { rows } = await rawPool.query(`UPDATE cbam_verifier_emails e SET status='sending', locked_at=now(), attempts=e.attempts+1
      WHERE e.id = (SELECT id FROM cbam_verifier_emails WHERE attempts < 6 AND
      ((status='pending' AND next_attempt_at <= now()) OR (status='sending' AND locked_at < now() - interval '5 minutes'))
      ORDER BY next_attempt_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING e.*`);
    const job = rows[0]; if (!job) break;
    try {
      const providerId = await sendResendEmail(job);
      await rawPool.query(`UPDATE cbam_verifier_emails SET status='sent', sent_at=now(), provider_id=$2, locked_at=NULL, last_error=NULL WHERE id=$1`, [job.id, providerId]);
    } catch (error) {
      const safeCode = error instanceof Error && /^resend_[a-z0-9_]+$/.test(error.message) ? error.message : 'delivery_failed';
      await rawPool.query(`UPDATE cbam_verifier_emails SET status=CASE WHEN attempts >= 6 THEN 'failed' ELSE 'pending' END,
        next_attempt_at=now() + (LEAST(3600, 30 * power(2, attempts)) * interval '1 second'), locked_at=NULL, last_error=$2 WHERE id=$1`, [job.id, safeCode]);
    }
  }
}
