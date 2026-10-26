import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { evaluateVerifier, getVerifierConfig, matchCustomsCode, visibleVerifierQuestions } from './index.ts';
import { missingTranslations } from './localize.ts';

const guide = JSON.parse(readFileSync(fileURLToPath(new URL('../../../../apps/web/src/content/cbam.json', import.meta.url)), 'utf8'));
const config = JSON.parse(readFileSync(fileURLToPath(new URL('./config.fr.json', import.meta.url)), 'utf8'));
const answers = { exports: 'yes', family: 'steel', threshold: 'yes', emissions: 'no', collection: 'no', verifier: 'no', requested: 'no' };

describe('CBAM language catalogues', () => {
  it('keeps French behaviour and the decision codes', () => {
    assert.equal(matchCustomsCode('7318').description, 'Vis, boulons et articles similaires');
    assert.equal(getVerifierConfig('fr').questions[0].options[0].value, 'yes');
    assert.deepEqual(getVerifierConfig('en').visibility.thresholdExemptFamilies, ['hydrogen', 'electricity']);
    assert.equal(getVerifierConfig('de').fallbackVerdict, 'probable');
    assert.equal(visibleVerifierQuestions({ ...answers, family: 'hydrogen' }, 'es').some(q => q.id === 'threshold'), false);
  });
  it('translates the checker, the customs text and the official source', () => {
    assert.equal(matchCustomsCode('7318', 'en').description, 'Screws, bolts and similar articles');
    assert.equal(matchCustomsCode('7318', 'de').family, 'steel');
    const english = evaluateVerifier(answers, '7318', 'en');
    assert.equal(english.verdict, 'concerned');
    assert.equal(english.score, 0);
    assert.match(english.steps[0], /CBAM method/);
    assert.equal(getVerifierConfig('en').customs.source, 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02023R0956-20251020');
    assert.equal(getVerifierConfig('de').verdicts.concerned.label, 'Betroffen');
    assert.equal(getVerifierConfig('es').verdicts.probable.label, 'Probablemente en el ámbito');
  });
  it('covers every displayed sentence in English, German and Spanish', () => {
    for (const locale of ['en', 'de', 'es'] as const) {
      assert.deepEqual(missingTranslations(config, locale), []);
      assert.deepEqual(missingTranslations(guide, locale), []);
    }
  });
});
