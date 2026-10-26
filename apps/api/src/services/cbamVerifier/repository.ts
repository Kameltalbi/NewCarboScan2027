import { createHash } from 'node:crypto';
import { rawPool, pool } from '../../db.js';
import { getVerifierConfig, verifierConfig as c, type VerifierResult } from '@newcarboscan/carbon-engine/cbam-verifier';
import { buildVerifierDocuments, type VerifierLead } from './emails.js';
export type StoredLead = { id: string; createdAt: string };
export type ExportRow = { created_at: string; full_name: string; company_name: string; email: string; phone: string; payload: Record<string, unknown>; delivery: string };
export type VerifierRepository = {
  save(lead: VerifierLead, result: VerifierResult, ip: string): Promise<StoredLead>;
  list(): Promise<ExportRow[]>;
};
export const verifierRepository: VerifierRepository = {
  async save(lead, result, ip) {
    const date = new Date().toISOString();
    const submissionHash = createHash('sha256').update(JSON.stringify(lead)).digest('hex');
    const copy = getVerifierConfig(lead.locale);
    const payload = { answers: lead.answers, customsCode: lead.customsCode, country: lead.country, locale: copy.locale, result, consent: true, consentText: copy.form.consent, consentAt: date, source: copy.path, configurationVersion: copy.version, reportDelivery: "download", submissionHash };
    const emails = buildVerifierDocuments(lead, result, date);
    const client = await rawPool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query(`INSERT INTO contact_requests (id, request_type, email, phone, company_name, full_name, payload, ip)
        VALUES ($1,'cbam_verifier',$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING RETURNING id, created_at`,
        [lead.requestId, lead.email, lead.phone || null, lead.companyName, lead.fullName, JSON.stringify(payload), ip]);
      if (!inserted.rows[0]) {
        const existing = await client.query(`SELECT id, created_at, payload FROM contact_requests WHERE id=$1 AND request_type='cbam_verifier'`, [lead.requestId]);
        if (!existing.rows[0] || existing.rows[0].payload.submissionHash !== submissionHash) throw Object.assign(new Error('Cette demande existe déjà avec un contenu différent.'), { statusCode: 409 });
        await client.query('COMMIT');
        return { id: existing.rows[0].id, createdAt: new Date(existing.rows[0].created_at).toISOString() };
      }
      await client.query(`INSERT INTO cbam_verifier_emails (lead_id, kind, recipient, message) VALUES ($1,'internal',$2,$3)`, [lead.requestId, process.env.CBAM_NOTIFICATION_EMAIL || 'contact@carboscan.io', JSON.stringify(emails.internal)]);
      await client.query('COMMIT');
      return { id: inserted.rows[0].id, createdAt: new Date(inserted.rows[0].created_at).toISOString() };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  },
  async list() {
    const { rows } = await pool.query(`SELECT c.created_at, c.full_name, c.company_name, c.email, c.phone, c.payload,
      COALESCE((SELECT string_agg(e.kind || ':' || e.status, ', ' ORDER BY e.kind) FROM cbam_verifier_emails e WHERE e.lead_id=c.id), 'pending') AS delivery
      FROM contact_requests c WHERE c.request_type='cbam_verifier' ORDER BY c.created_at DESC`);
    return rows.map(row => ({ ...row, created_at: new Date(row.created_at).toISOString() })) as ExportRow[];
  },
};
export function verifierLeadsCsv(rows: ExportRow[]): string {
  const cell = (value: unknown) => {
    let text = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
    const first = [...text].find(ch => ch.trim().length > 0 && ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) !== 127);
    if (first && '=+@-'.includes(first)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const data = rows.map(row => { const p = row.payload; const result = p.result as Partial<VerifierResult> | undefined;
    return [row.created_at, row.full_name, row.company_name, row.email, p.country, row.phone, result?.verdict && c.verdicts[result.verdict] ? c.verdicts[result.verdict].label : '—', result?.score, p.customsCode, p.answers, result?.steps, p.source, p.consentAt, row.delivery];
  });
  return '\uFEFF' + [c.csv.headers, ...data].map(row => row.map(cell).join(';')).join('\r\n');
}
