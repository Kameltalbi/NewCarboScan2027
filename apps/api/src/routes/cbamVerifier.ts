import { renderVerifierPdf } from '../services/cbamVerifier/pdf.js';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { evaluateVerifier, matchCustomsCode, validateVerifierAnswers, verifierConfig as c } from '@newcarboscan/carbon-engine/cbam-verifier';
import { verifierRepository, verifierLeadsCsv, type VerifierRepository } from '../services/cbamVerifier/repository.js';
import { drainVerifierEmails } from '../services/cbamVerifier/outbox.js';
const shortText = (max: number) => z.string().trim().min(1).max(max).refine(value => [...value].every(ch => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) !== 127));
const schema = z.object({
  requestId: z.string().uuid().optional(), fullName: shortText(200), companyName: shortText(200), country: z.string().trim().max(200).optional().default(''),
  email: z.string().trim().email().max(320).transform(s => s.toLowerCase()), phone: z.string().trim().regex(/^[+\d(). -]{6,40}$/).refine(value => value.replace(/\D/g, '').length >= 6),
  consent: z.literal(true), website: z.string().max(200).optional().default(''), customsCode: z.string().trim().max(15).optional().default(''),
  answers: z.record(z.string(), z.string().max(50)),
}).strict();
export async function registerCbamVerifierRoutes(app: FastifyInstance, options: { repository?: VerifierRepository; worker?: boolean; renderReport?: typeof renderVerifierPdf } = {}) {
  const repository = options.repository || verifierRepository;
  let busy = false;
  const drain = async () => {
    if (busy) return; busy = true;
    try { await drainVerifierEmails(); } catch { app.log.error('CBAM verifier email queue unavailable'); } finally { busy = false; }
  };
  if (options.worker !== false) {
    const timer = setInterval(() => { void drain(); }, 30000); timer.unref();
    app.addHook('onReady', async () => { void drain(); });
    app.addHook('onClose', async () => { clearInterval(timer); });
  }
  app.post('/v1/public/cbam-verifier/leads', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    // Silently discard the honeypot before processing any personal information.
    if (request.body && typeof request.body === 'object' && 'website' in request.body && typeof request.body.website === 'string' && request.body.website.trim()) return reply.code(202).send({ ok: true, delivery: 'queued' });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: c.form.invalid });
    const input = parsed.data;
    const known = new Set(c.questions.map(q => q.id));
    if (Object.keys(input.answers).some(key => !known.has(key)) || !validateVerifierAnswers(input.answers)) return reply.code(400).send({ error: c.form.invalid });
    const match = input.customsCode ? matchCustomsCode(input.customsCode) : null;
    if (match?.status === 'invalid' || (match?.family && input.answers.family !== match.family)) return reply.code(400).send({ error: c.form.invalid });
    const result = evaluateVerifier(input.answers, input.customsCode);
    const saved = await repository.save({ ...input, requestId: input.requestId || randomUUID() }, result, request.ip);
    if (options.worker !== false) void drain();
    const pdf = await (options.renderReport || renderVerifierPdf)({ ...input, requestId: saved.id }, result, saved.createdAt);
    return reply.code(200).header('Content-Disposition', `attachment; filename="${c.form.filename}"`).type('application/pdf').send(pdf);
  });
  app.get('/v1/admin/cbam-verifier/leads.csv', { preHandler: [app.requireSuperAdmin] }, async (_request, reply) => {
    reply.header('Cache-Control', 'no-store').header('Content-Disposition', 'attachment; filename="contacts-verificateur-cbam.csv"').type('text/csv; charset=utf-8');
    return verifierLeadsCsv(await repository.list());
  });
}
