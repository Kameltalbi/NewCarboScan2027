import rawConfig from './config.fr.json' with { type: 'json' };
import { localizeTree, normalizeVerifierLocale, type VerifierLocale } from './localize.js';
export const verifierConfig = rawConfig;
export { localizeTree, normalizeVerifierLocale };
export type { VerifierLocale };
const localizedConfigs = new Map<VerifierLocale, typeof rawConfig>();
export function getVerifierConfig(locale?: string) {
  const code = normalizeVerifierLocale(locale);
  if (code === 'fr') return rawConfig;
  const cached = localizedConfigs.get(code);
  if (cached) return cached;
  const localized = localizeTree(rawConfig, code);
  localized.locale = code;
  localized.customs.source = rawConfig.customs.source.replace('/legal-content/FR/', `/legal-content/${code.toUpperCase()}/`);
  localizedConfigs.set(code, localized);
  return localized;
}
function catalog(locale?: string) { return getVerifierConfig(locale); }
export type VerifierAnswers = Record<string, string | undefined>;
export type VerifierVerdict = 'concerned' | 'probable' | 'not_direct';
export type CodeStatus = 'covered' | 'excluded' | 'partial' | 'conditional' | 'unlisted' | 'invalid';
export type CodeMatch = { code: string; status: CodeStatus; family?: string; description?: string };
type Condition = { field?: string; in?: string[]; all?: Condition[]; any?: Condition[] };
export type VerifierResult = {
  verdict: VerifierVerdict; score: number; band: string; bandLabel: string;
  steps: string[]; urgent: boolean; codeMatch?: CodeMatch; version: string;
};
export function matchesCondition(condition: Condition, answers: VerifierAnswers): boolean {
  if (condition.all) return condition.all.every(c => matchesCondition(c, answers));
  if (condition.any) return condition.any.some(c => matchesCondition(c, answers));
  return !!condition.field && !!condition.in?.includes(answers[condition.field] ?? '');
}
export function matchCustomsCode(input: string, locale = 'fr'): CodeMatch {
  const code = input.replace(/\s/g, '');
  const active = catalog(locale);
  if (!/^\d{4,8}$/.test(code)) return { code, status: 'invalid' };
  const entries = active.customs.entries;
  for (const entry of entries) {
    if (!code.startsWith(entry.code)) continue;
    if (entry.exclusions.some(ex => code.startsWith(ex))) return { code, status: 'excluded', family: 'other', description: entry.description };
    if (entry.conditional) return { code, status: 'conditional', family: entry.family, description: entry.description };
    if (entry.exclusions.some(ex => ex.startsWith(code))) return { code, status: 'partial', family: entry.family, description: entry.description };
    return { code, status: 'covered', family: entry.family, description: entry.description };
  }
  const candidates = entries.filter(entry => entry.code.startsWith(code));
  if (candidates.length) return { code, status: 'partial', family: candidates[0].family };
  return { code, status: 'unlisted', family: 'other' };
}
export function visibleVerifierQuestions(answers: VerifierAnswers, locale = 'fr') {
  const active = catalog(locale);
  return active.questions.filter(q => q.id !== 'threshold' || !active.visibility.thresholdExemptFamilies.includes(answers.family ?? ''));
}
export function validateVerifierAnswers(answers: VerifierAnswers, locale = 'fr'): boolean {
  return visibleVerifierQuestions(answers, locale).every(q => q.options.some(o => o.value === answers[q.id]));
}
export function evaluateVerifier(answers: VerifierAnswers, customsCode = '', locale = 'fr'): VerifierResult {
  const active = catalog(locale);
  const codeMatch = customsCode.trim() ? matchCustomsCode(customsCode, locale) : undefined;
  const effective: VerifierAnswers = { ...answers, effectiveFamily: answers.family };
  if (codeMatch) {
    effective.effectiveFamily = codeMatch.status === 'covered' ? codeMatch.family
      : ['excluded', 'unlisted'].includes(codeMatch.status) ? 'other' : 'unknown';
  }
  const verdict = (active.rules.find(rule => matchesCondition(rule.when as Condition, effective))?.verdict ?? active.fallbackVerdict) as VerifierVerdict;
  const base = active.questions.reduce((sum, q) => sum + (q.options.find(o => o.value === answers[q.id])?.points ?? 0), 0);
  const bonus = matchesCondition(active.score.bonus.when, effective) ? active.score.bonus.points : 0;
  const score = Math.min(active.score.max, base + bonus);
  const band = active.score.bands.find(b => score <= b.max)!;
  const steps = verdict === 'not_direct' ? [...active.notDirectSteps] : active.nextSteps.filter(step => matchesCondition(step.when, effective)).map(step => step.text);
  for (const text of active.defaultSteps) if (steps.length < 3 && !steps.includes(text)) steps.push(text);
  return { verdict, score, band: band.id, bandLabel: band.label, steps: steps.slice(0, 3), urgent: matchesCondition(active.urgency.when, effective), ...(codeMatch ? { codeMatch } : {}), version: active.version };
}
export function labelledVerifierAnswers(answers: VerifierAnswers, locale = 'fr') {
  const active = catalog(locale);
  return visibleVerifierQuestions(answers, locale).map(q => ({ question: q.title, answer: q.options.find(o => o.value === answers[q.id])?.label ?? active.ui.notAsked }));
}
