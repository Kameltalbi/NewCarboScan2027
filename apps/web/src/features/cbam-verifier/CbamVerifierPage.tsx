import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useVerifierConfig } from './useVerifierConfig';
import { evaluateVerifier, matchCustomsCode, visibleVerifierQuestions, labelledVerifierAnswers, type VerifierAnswers } from '@cbam-verifier';
import { SolutionLandingShell } from '@/components/seo/SolutionLandingShell';
import { SEOHead } from '@/components/seo/SEOHead';
import { buildFaqSchema } from '@/config/seo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/integrations/api/client';
import { trackEvent } from '@/lib/analytics';

const CbamVerifierPage = () => {
  const c = useVerifierConfig();
  const locale = c.locale;
  const [stage, setStage] = useState<'intro' | 'questions' | 'result'>('intro');
  const [answers, setAnswers] = useState<VerifierAnswers>({});
  const [questionId, setQuestionId] = useState(c.questions[0].id);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [reportUrl, setReportUrl] = useState('');
  useEffect(() => () => { if (reportUrl) URL.revokeObjectURL(reportUrl); }, [reportUrl]);
  const [submitted, setSubmitted] = useState(false);
  const requestId = useRef('');
  const focusRef = useRef<HTMLHeadingElement>(null);
  const flow = useRef({ started: false, complete: false, lastQuestion: '', abandoned: false });
  const questions = visibleVerifierQuestions(answers, locale);
  const index = Math.max(0, questions.findIndex(q => q.id === questionId));
  const question = questions[index];
  const result = evaluateVerifier(answers, code, locale);
  const codeMatch = code.trim() ? matchCustomsCode(code, locale) : null;
  const selected = answers[question.id];

  useEffect(() => {
    if (stage !== 'intro') { focusRef.current?.focus({ preventScroll: true }); focusRef.current?.closest('section')?.scrollIntoView({ block: 'start', behavior: 'instant' }); }
  }, [stage, questionId]);
  useEffect(() => {
    const abandon = () => {
      if (!flow.current.started || flow.current.complete || flow.current.abandoned) return;
      flow.current.abandoned = true;
      trackEvent('cbam_verifier_abandoned', { question_id: flow.current.lastQuestion });
    };
    const visibility = () => { if (document.visibilityState === 'hidden') abandon(); else flow.current.abandoned = false; };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', abandon);
    return () => { abandon(); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', abandon); };
  }, []);
  const start = () => {
    flow.current = { started: true, complete: false, lastQuestion: c.questions[0].id, abandoned: false };
    setStage('questions'); setQuestionId(c.questions[0].id);
    trackEvent('cbam_verifier_started', { version: c.version });
  };
  const choose = (id: string, value: string) => {
    setError('');
    setAnswers(previous => {
      const next = { ...previous, [id]: value };
      if (id === 'family' && previous.family !== value) delete next.threshold;
      return next;
    });
  };
  const changeCode = (value: string) => {
    setCode(value); setError('');
    const match = matchCustomsCode(value, locale);
    if (match.family) choose('family', match.family);
  };
  const next = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || (question.id === 'family' && codeMatch?.status === 'invalid')) { setError(codeMatch?.status === 'invalid' ? c.customs.statuses.invalid : c.ui.select); return; }
    trackEvent('cbam_verifier_question_validated', { question_id: question.id, step: index + 1 });
    if (index === questions.length - 1) {
      flow.current.complete = true;
      setStage('result');
      trackEvent('cbam_verifier_result_viewed', { verdict: result.verdict, score_band: result.band });
    } else {
      const nextQuestion = questions[index + 1].id;
      flow.current.lastQuestion = nextQuestion; setQuestionId(nextQuestion);
    }
    setError('');
  };
  const back = () => { setQuestionId(questions[Math.max(0, index - 1)].id); flow.current.lastQuestion = questions[Math.max(0, index - 1)].id; setError(''); };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    const data = new FormData(event.currentTarget);
    if (data.get('consent') !== 'on') { setError(c.form.consentRequired); return; }
    if (!requestId.current) requestId.current = crypto.randomUUID();
    setSending(true);
    try {
      const report = await api.submitCbamVerifierLead({
        requestId: requestId.current,
        fullName: String(data.get('fullName') || ''), companyName: String(data.get('companyName') || ''),
        email: String(data.get('email') || ''), country: String(data.get('country') || ''), phone: String(data.get('phone') || ''),
        consent: true, website: String(data.get('website') || ''), answers, customsCode: code.trim(), locale,
      });
      const url = URL.createObjectURL(report); setReportUrl(url);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = c.form.filename; anchor.click();
      setSubmitted(true);
      trackEvent('cbam_verifier_lead_submitted', { verdict: result.verdict, score_band: result.band });
    } catch { setError(c.form.error); } finally { setSending(false); }
  };
  const tone = result.verdict === 'concerned' ? 'border-red-200 bg-red-50 text-red-800' : result.verdict === 'probable' ? 'border-orange-200 bg-orange-50 text-orange-800' : 'border-green-200 bg-green-50 text-green-800';
  const whatsappText = c.ui.whatsappMessage.replace('{verdict}', c.verdicts[result.verdict].label).replace('{score}', String(result.score));

  return <SolutionLandingShell path={c.path} showRelated={false} breadcrumbs={[{ name: c.ui.home, path: '/' }, { name: c.intro.badge, path: c.path }]}>
    <SEOHead path={c.path} title={c.seo.title} description={c.seo.description} breadcrumbs={[{ name: c.ui.home, path: '/' }, { name: c.intro.badge, path: c.path }]} jsonLd={[
      { '@context': 'https://schema.org', '@type': 'WebApplication', name: c.seo.h1, url: `https://carboscan.io${c.path}`, applicationCategory: 'BusinessApplication', operatingSystem: 'Web', inLanguage: locale, offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR' } },
      buildFaqSchema(c.faqs),
    ]} />
    <div className="container mx-auto max-w-4xl px-4 py-10 md:py-16">
      <header className="mb-10"><span className="text-sm font-semibold text-primary">{c.intro.badge}</span>
        <h1 className="mt-3 text-3xl md:text-5xl font-bold text-foreground leading-tight">{c.seo.h1}</h1>
        <p className="mt-5 text-lg font-semibold text-primary">{c.intro.subtitle}</p><p className="mt-4 text-muted-foreground leading-relaxed">{c.intro.text}</p>
      </header>
      <section className="rounded-xl border border-border bg-card p-5 md:p-8 scroll-mt-28" aria-label={c.intro.badge}>
        {stage === 'intro' && <><h2 className="text-2xl font-bold">{c.intro.howTitle}</h2><p className="mt-4 leading-relaxed text-muted-foreground">{c.intro.how}</p><Button className="mt-6" size="lg" onClick={start}>{c.intro.start}</Button><noscript><p>{c.intro.noScript}</p></noscript></>}
        {stage === 'questions' && <>
          <div className="mb-6"><p className="mb-2 text-sm text-muted-foreground">{c.ui.question} {index + 1} {c.ui.of} {questions.length}</p><progress aria-label={c.ui.progress} className="h-2 w-full accent-primary" value={index} max={questions.length} /></div>
          <form onSubmit={next}>
            <h2 ref={focusRef} tabIndex={-1} id="cbam-question" className="text-xl md:text-2xl font-bold outline-none scroll-mt-28">{question.title}</h2>
            {question.hint && <details className="mt-4 rounded bg-muted p-3"><summary className="cursor-pointer text-sm font-semibold">{c.ui.understand}</summary><p className="mt-2 text-sm text-muted-foreground">{question.hint}</p></details>}
            <fieldset aria-labelledby="cbam-question" className="mt-6 space-y-3">
              {question.options.map(option => <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${selected === option.value ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <input type="radio" name={question.id} value={option.value} checked={selected === option.value} onChange={() => choose(question.id, option.value)} className="mt-1 accent-primary" required />
                <span>{option.label}</span>
              </label>)}
            </fieldset>
            {question.id === 'family' && <div className="mt-6 space-y-2"><Label htmlFor="customs-code">{c.customs.label}</Label><Input id="customs-code" inputMode="numeric" value={code} maxLength={15} onChange={event => changeCode(event.target.value)} aria-describedby="customs-code-hint customs-code-result" /><p id="customs-code-hint" className="text-sm text-muted-foreground">{c.customs.hint}</p><p id="customs-code-result" className="text-sm font-medium" role="status">{codeMatch && c.customs.statuses[codeMatch.status]}</p></div>}
            {error && <p className="mt-4 text-red-700" role="alert">{error}</p>}
            <div className="mt-7 flex justify-between gap-4"><Button type="button" variant="outline" onClick={back} disabled={index === 0}>{c.ui.back}</Button><Button type="submit">{index === questions.length - 1 ? c.ui.seeResult : c.ui.next}</Button></div>
          </form>
        </>}
        {stage === 'result' && <div data-testid="cbam-verifier-result">
          <h2 ref={focusRef} tabIndex={-1} className="text-2xl font-bold outline-none scroll-mt-28">{c.ui.result}</h2>
          <div className={`mt-5 rounded-xl border p-6 ${tone}`}><p className="text-2xl md:text-3xl font-bold" data-testid="verdict">{c.verdicts[result.verdict].label}</p><p className="mt-3">{c.verdicts[result.verdict].description}</p></div>
          <div className="mt-7"><p className="font-semibold">{c.ui.score} : <span data-testid="score">{result.score}</span>/100</p><meter aria-label={c.ui.score} value={result.score} min={0} max={100} className="mt-2 h-4 w-full" /><p className="mt-2 text-muted-foreground">{result.bandLabel}</p></div>
          {result.urgent && <p className="mt-5 font-semibold text-orange-800">{c.urgency.text}</p>}
          <h3 className="mt-7 text-xl font-bold">{c.ui.steps}</h3><ol className="mt-4 list-decimal pl-6 space-y-3">{result.steps.map(step => <li key={step}>{step}</li>)}</ol>
          {result.codeMatch && <p className="mt-5 text-sm text-muted-foreground">{c.customs.statuses[result.codeMatch.status]}</p>}
          {result.verdict === 'not_direct' && <Link className="mt-5 inline-block underline text-primary" to="/bilan-carbone">{c.ui.footprint}</Link>}
          <p className="mt-6 rounded bg-muted p-4 text-sm text-muted-foreground">{c.disclaimer}</p>
          <div className="mt-6 flex flex-wrap gap-3"><Button asChild><Link to="/demo" onClick={() => trackEvent('cbam_verifier_demo_click', { verdict: result.verdict, score_band: result.band })}>{c.ui.demo}</Link></Button><Button variant="outline" asChild><a href={`https://wa.me/21655053033?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('cbam_verifier_whatsapp_click', { verdict: result.verdict, score_band: result.band })}>{c.ui.whatsapp}</a></Button><Button variant="link" asChild><Link to="/cbam">{c.ui.understand}</Link></Button></div>
          <details className="mt-7"><summary className="cursor-pointer font-semibold">{c.ui.answers}</summary><dl className="mt-4 space-y-4">{labelledVerifierAnswers(answers, locale).map(item => <div key={item.question}><dt className="font-medium">{item.question}</dt><dd className="mt-1 text-muted-foreground">{item.answer}</dd></div>)}</dl></details>
          <div className="mt-9 border-t border-border pt-7"><h3 className="text-xl font-bold">{c.form.title}</h3><p className="mt-3 text-muted-foreground">{c.form.intro}</p>
            {submitted ? <div className="mt-5 rounded bg-green-50 p-4 text-green-800"><p role="status">{c.form.success}</p><a className="mt-3 inline-block underline font-semibold" href={reportUrl} download={c.form.filename}>{c.form.downloadAgain}</a></div> : <form onSubmit={submit} className="mt-5 space-y-4" aria-label={c.form.title}>
              <div className="grid sm:grid-cols-2 gap-4">{[['fullName', c.form.fullName], ['companyName', c.form.company], ['email', c.form.email], ['country', c.form.country], ['phone', c.form.phone]].map(([name, label]) => <div key={name} className="space-y-2"><Label htmlFor={`lead-${name}`}>{label}</Label><Input id={`lead-${name}`} name={name} type={name === 'email' ? 'email' : name === 'phone' ? 'tel' : 'text'} required={name !== 'country'} maxLength={name === 'email' ? 320 : name === 'phone' ? 40 : 200} autoComplete={name === 'fullName' ? 'name' : name === 'companyName' ? 'organization' : name === 'country' ? 'country-name' : name === 'phone' ? 'tel' : 'email'} /></div>)}</div>
              <div className="hidden" aria-hidden="true"><label htmlFor="lead-website">{c.form.honeypot}</label><input id="lead-website" name="website" tabIndex={-1} autoComplete="off" /></div>
              <label className="flex items-start gap-3 text-sm"><input name="consent" type="checkbox" required className="mt-1 accent-primary" /><span>{c.form.consent} <Link className="text-primary underline" to="/privacy-policy">{c.form.privacy}</Link></span></label>
              <p className="text-sm text-muted-foreground">{c.form.privacyNote}</p>
              {error && <p role="alert" className="text-red-700">{error}</p>}
              <Button type="submit" disabled={sending}>{sending ? c.form.sending : c.form.submit}</Button>
            </form>}
          </div>
          <Button variant="link" className="mt-6" onClick={() => { setAnswers({}); setCode(''); setSubmitted(false); setReportUrl(''); requestId.current = ''; setError(''); start(); }}>{c.ui.restart}</Button>
        </div>}
      </section>
      <section className="mt-12" aria-labelledby="verifier-faq"><h2 id="verifier-faq" className="text-2xl font-bold">{c.ui.faqTitle}</h2><div className="mt-6 space-y-6">{c.faqs.map(faq => <article key={faq.question}><h3 className="text-lg font-semibold">{faq.question}</h3><p className="mt-2 leading-relaxed text-muted-foreground">{faq.answer}</p></article>)}</div></section>
      <p className="mt-8 text-sm"><a className="underline text-primary" href={c.customs.source} target="_blank" rel="noopener noreferrer">{c.ui.sourceLabel}</a></p>
    </div>
  </SolutionLandingShell>;
};
export default CbamVerifierPage;
