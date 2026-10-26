import rawConfig from './config.fr.json' with { type: 'json' };
export const verifierConfig = rawConfig;
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
export function matchCustomsCode(input: string): CodeMatch {
  const code = input.replace(/\s/g, '');
  if (!/^\d{4,8}$/.test(code)) return { code, status: 'invalid' };
  const entries = verifierConfig.customs.entries;
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
export function visibleVerifierQuestions(answers: VerifierAnswers) {
  return verifierConfig.questions.filter(q => q.id !== 'threshold' || !verifierConfig.visibility.thresholdExemptFamilies.includes(answers.family ?? ''));
}
export function validateVerifierAnswers(answers: VerifierAnswers): boolean {
  return visibleVerifierQuestions(answers).every(q => q.options.some(o => o.value === answers[q.id]));
}
export function evaluateVerifier(answers: VerifierAnswers, customsCode = ''): VerifierResult {
  const codeMatch = customsCode.trim() ? matchCustomsCode(customsCode) : undefined;
  const effective: VerifierAnswers = { ...answers, effectiveFamily: answers.family };
  if (codeMatch) {
    effective.effectiveFamily = codeMatch.status === 'covered' ? codeMatch.family
      : ['excluded', 'unlisted'].includes(codeMatch.status) ? 'other' : 'unknown';
  }
  const verdict = (verifierConfig.rules.find(rule => matchesCondition(rule.when as Condition, effective))?.verdict ?? verifierConfig.fallbackVerdict) as VerifierVerdict;
  const base = verifierConfig.questions.reduce((sum, q) => sum + (q.options.find(o => o.value === answers[q.id])?.points ?? 0), 0);
  const bonus = matchesCondition(verifierConfig.score.bonus.when, effective) ? verifierConfig.score.bonus.points : 0;
  const score = Math.min(verifierConfig.score.max, base + bonus);
  const band = verifierConfig.score.bands.find(b => score <= b.max)!;
  const steps = verdict === 'not_direct' ? [...verifierConfig.notDirectSteps] : verifierConfig.nextSteps.filter(step => matchesCondition(step.when, effective)).map(step => step.text);
  for (const text of verifierConfig.defaultSteps) if (steps.length < 3 && !steps.includes(text)) steps.push(text);
  return { verdict, score, band: band.id, bandLabel: band.label, steps: steps.slice(0, 3), urgent: matchesCondition(verifierConfig.urgency.when, effective), ...(codeMatch ? { codeMatch } : {}), version: verifierConfig.version };
}
export function labelledVerifierAnswers(answers: VerifierAnswers) {
  return visibleVerifierQuestions(answers).map(q => ({ question: q.title, answer: q.options.find(o => o.value === answers[q.id])?.label ?? verifierConfig.ui.notAsked }));
}
