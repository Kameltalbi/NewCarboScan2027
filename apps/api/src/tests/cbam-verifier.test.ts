import { registerPublicRoutes } from "../routes/public.js";
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { evaluateVerifier, matchCustomsCode, validateVerifierAnswers, visibleVerifierQuestions, verifierConfig, type VerifierAnswers } from '@newcarboscan/carbon-engine/cbam-verifier';
import { registerCbamVerifierRoutes } from '../routes/cbamVerifier.js';
import { buildVerifierDocuments } from '../services/cbamVerifier/emails.js';
import { sendResendEmail } from '../services/cbamVerifier/outbox.js';
import { verifierLeadsCsv, type VerifierRepository } from '../services/cbamVerifier/repository.js';
const unprepared = { exports: 'yes', family: 'steel', threshold: 'yes', emissions: 'no', collection: 'no', verifier: 'no', requested: 'no' };
const prepared = { ...unprepared, emissions: 'cbam', collection: 'yes', verifier: 'yes', requested: 'yes' };
const lead = { requestId: '8df6d55f-7113-46fe-99c6-078e76d21d27', fullName: 'Sana Exemple', companyName: 'Export Démonstration', email: 'sana@example.invalid', country: 'Tunisie', phone: '+21655053033', consent: true as const, website: '', answers: unprepared, customsCode: '' };
describe('CBAM verifier decisions and annex I', () => {
  it('steel, EU, importer above threshold, unprepared => concerned, zero', () => {
    const result = evaluateVerifier(unprepared); assert.equal(result.verdict, 'concerned'); assert.equal(result.score, 0); assert.equal(result.steps.length, 3);
  });
  it('cement with unknown threshold => probably concerned', () => { assert.equal(evaluateVerifier({ ...unprepared, family: 'cement', threshold: 'unknown' }).verdict, 'probable'); });
  it('electricity skips the threshold and remains concerned even with a stale no answer', () => {
    const answers = { ...unprepared, family: 'electricity', threshold: 'no' };
    assert.equal(visibleVerifierQuestions(answers).length, 6); assert.ok(!visibleVerifierQuestions(answers).some(q => q.id === 'threshold'));
    assert.equal(evaluateVerifier(answers).verdict, 'concerned'); delete (answers as VerifierAnswers).threshold; assert.ok(validateVerifierAnswers(answers));
  });
  it('textile / other products => not directly concerned', () => { assert.equal(evaluateVerifier({ ...unprepared, family: 'other' }).verdict, 'not_direct'); });
  it('7318 suggests iron and steel; all ready and requested => score 100', () => {
    assert.deepEqual(matchCustomsCode('7318'), { code: '7318', status: 'covered', family: 'steel', description: 'Vis, boulons et articles similaires' });
    assert.equal(evaluateVerifier(prepared, '7318').score, 100);
    assert.equal(evaluateVerifier({ ...prepared, emissions: 'estimate' }).score, 65);
  });
  it('handles exclusions, partial codes and ex descriptions without certainty', () => {
    for (const code of ['7204', '7202 30 00', '72029980', '31056000']) assert.equal(matchCustomsCode(code).status, 'excluded', code);
    for (const code of ['7202', '3105', '2507', '7303']) assert.equal(matchCustomsCode(code).status, 'partial', code);
    assert.equal(matchCustomsCode('25070080').status, 'conditional');
    assert.equal(evaluateVerifier({ ...unprepared, family: 'cement' }, '25070080').verdict, 'probable');
    assert.equal(matchCustomsCode('720211').status, 'covered'); assert.equal(matchCustomsCode('72026000').status, 'covered');
    assert.equal(matchCustomsCode('7602').status, 'unlisted'); assert.equal(matchCustomsCode('7318;DROP').status, 'invalid');
    assert.equal(verifierConfig.customs.entries.length, 42);
  });
  it('covers unspecified planned/unknown cases conservatively, and gates the bonus', () => {
    assert.equal(evaluateVerifier({ ...unprepared, exports: 'planned', family: 'hydrogen', threshold: undefined }).verdict, 'probable');
    assert.equal(evaluateVerifier({ ...unprepared, exports: 'planned', family: 'unknown' }).verdict, 'probable');
    assert.equal(evaluateVerifier({ ...prepared, requested: 'no' }).score, 85);
    assert.ok(evaluateVerifier({ ...unprepared, requested: 'yes' }).urgent);
    assert.equal(validateVerifierAnswers({ ...unprepared, emissions: 'invented' }), false);
  });
});
describe('CBAM lead API and delivery', () => {
  async function app() {
    const saved: Array<{ lead: unknown; result: ReturnType<typeof evaluateVerifier> }> = [];
    const repository: VerifierRepository = { save: async (value, result) => { saved.push({ lead: value, result }); return { id: value.requestId, createdAt: '2026-10-26T12:00:00Z' }; }, list: async () => [] };
    const server = Fastify();
    server.decorate('requireSuperAdmin', async (_request, reply) => reply.code(403).send({ error: 'Forbidden' }));
    await server.register(rateLimit, { max: 1000, timeWindow: '1 minute' });
    await registerPublicRoutes(server);
    await registerCbamVerifierRoutes(server, { repository, worker: false, renderReport: async () => Buffer.from('%PDF-1.4\npreview') });
    return { server, saved };
  }
  it('saves only a final, consented request and recomputes results on the server', async () => {
    const { server, saved } = await app();
    try {
      const response = await server.inject({ method: 'POST', url: '/v1/public/cbam-verifier/leads', payload: lead });
      assert.equal(response.statusCode, 200); assert.equal(saved.length, 1); assert.equal(saved[0].result.score, 0); assert.equal(saved[0].result.verdict, 'concerned');
      assert.match(String(response.headers['content-type']), /application\/pdf/); assert.ok(response.rawPayload.subarray(0, 5).equals(Buffer.from('%PDF-')));
    } finally { await server.close(); }
  });
  it('rejects missing consent, incomplete answers, invalid codes and forged results; discards spam', async () => {
    const { server, saved } = await app();
    try {
      for (const payload of [{ ...lead, consent: false }, { ...lead, answers: {} }, { ...lead, customsCode: 'bad' }, { ...lead, score: 100 }, { ...lead, phone: '' }]) {
        const response = await server.inject({ method: 'POST', url: '/v1/public/cbam-verifier/leads', payload }); assert.equal(response.statusCode, 400);
      }
      // New IP avoids the configured five submissions/minute ceiling for this separate check.
      const spam = await server.inject({ method: 'POST', url: '/v1/public/cbam-verifier/leads', payload: { ...lead, website: 'https://spam.invalid' }, remoteAddress: '127.0.0.2' });
      assert.equal(spam.statusCode, 202); assert.equal(saved.length, 0);
      assert.equal((await server.inject({ method: 'POST', url: '/v1/public/leads', remoteAddress: '127.0.0.3', payload: { requestType: 'cbam_verifier', email: lead.email, payload: { score: 100 } } })).statusCode, 400);
      assert.equal((await server.inject({ url: '/v1/admin/cbam-verifier/leads.csv' })).statusCode, 403);
    } finally { await server.close(); }
  });
  it('rate-limits form submissions', async () => {
    const { server } = await app();
    try { for (let i = 0; i < 5; i++) await server.inject({ method: 'POST', url: '/v1/public/cbam-verifier/leads', payload: lead });
      assert.equal((await server.inject({ method: 'POST', url: '/v1/public/cbam-verifier/leads', payload: lead })).statusCode, 429);
    } finally { await server.close(); }
  });
  it('escapes contact values in emails and CSV; Resend receives idempotent messages', async () => {
    const result = evaluateVerifier(unprepared);
    const messages = buildVerifierDocuments({ ...lead, fullName: '<script>bad</script>' }, result, '2026-10-26T12:00:00Z');
    assert.ok(!messages.report.html.includes('<script>')); assert.ok(messages.report.html.includes('&lt;script&gt;'));
    assert.ok(messages.report.text.includes('0/100')); assert.equal(messages.internal.reply_to, lead.email);
    const csv = verifierLeadsCsv([{ created_at: '2026-10-26', full_name: '=HYPERLINK("bad")', company_name: 'Exemple', email: lead.email, phone: '+21612345678', payload: { country: 'Tunisie', result, answers: unprepared }, delivery: 'prospect:sent' }]);
    assert.ok(csv.includes('"\'=HYPERLINK')); assert.ok(csv.includes('"\'+216'));
    const previous = process.env.RESEND_API_KEY; process.env.RESEND_API_KEY = 'test-only';
    try {
      const fetcher = async (_url: unknown, init?: RequestInit) => {
        assert.equal((init?.headers as Record<string, string>)['Idempotency-Key'], `cbam-verifier/${lead.requestId}/internal`);
        const body = JSON.parse(String(init?.body)); assert.deepEqual(body.to, [lead.email]); assert.ok(body.html.includes('0/100'));
        return new Response(JSON.stringify({ id: 'email-example' }), { status: 200 });
      };
      await assert.rejects(sendResendEmail({ id: 'job', lead_id: lead.requestId, kind: 'prospect', recipient: lead.email, message: messages.report }, fetcher as typeof fetch), /resend_internal_only/);
      assert.equal(await sendResendEmail({ id: 'job', lead_id: lead.requestId, kind: 'internal', recipient: lead.email, message: messages.internal }, fetcher as typeof fetch), 'email-example');
      await assert.rejects(sendResendEmail({ id: 'job', lead_id: lead.requestId, kind: 'internal', recipient: lead.email, message: messages.internal }, (async () => new Response('provider details', { status: 422 })) as typeof fetch), /resend_http_422/);
    } finally { if (previous === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previous; }
  });
});
