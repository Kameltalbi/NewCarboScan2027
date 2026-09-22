import { useEffect, useRef, useState, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { useOptionalAuth } from "@/hooks/useAuth";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { completeDiagnostic, claimDiagnostic, createDiagnostic, DiagnosticRequestError, readDiagnostic, requestDiagnosticReport, saveDiagnosticAnswers } from "./api";
import { trackDiagnostic } from "./analytics";
import { downloadDiagnosticPdf } from "./diagnosticPdf";
import {
  RESULT_AXIS_LABELS,
  axisJustCompleted,
  axisText,
  buildAnswer,
  clearResume,
  firstUnansweredIndex,
  formatQuantity,
  indexAfterSave,
  indexBefore,
  moduleLink,
  optionText,
  parseQuantity,
  progressPercent,
  questionText,
  readResume,
  selectionFromAnswer,
  shownAnswer,
  splitOptions,
  writeResume,
} from "./flow";
import type { DiagnosticAnswer, PublicQuestion, PublicSnapshot, SessionView } from "./types";

type Phase = "loading" | "intro" | "questions" | "transition" | "result" | "invalid";
type SaveState = "idle" | "saving" | "saved" | "error";

const copy = {
  fr: {
    kicker: "Diagnostic Carbone 360°",
    meta: "≈ 5 min · Diagnostic personnalisé · Rapport gratuit",
    h1: "Évaluez la maturité carbone de votre entreprise",
    lead: "Identifiez en quelques minutes votre niveau de maturité, la disponibilité de vos données et vos principales priorités de décarbonation.",
    start: "Commencer mon diagnostic",
    benefits: [
      ["Évaluez votre maturité", "Découvrez où se situe votre organisation dans sa démarche carbone."],
      ["Évaluez vos données", "Identifiez si vous disposez des informations nécessaires pour mesurer vos émissions."],
      ["Identifiez vos priorités", "Obtenez les premières actions à engager."],
    ],
    disclaimer: "Ce diagnostic est un outil d'évaluation de maturité. Il ne constitue pas un bilan d'émissions de gaz à effet de serre.",
    profile: "Votre organisation",
    progress: (pct: number) => `${pct} % complété`,
    previous: "Précédent",
    next: "Continuer",
    see: "Voir mon diagnostic",
    unknownHelp: "Vous pourrez poursuivre même si certaines informations ne sont pas encore disponibles.",
    needAnswer: "Choisissez une réponse pour continuer.",
    needNumber: "Indiquez une valeur ou choisissez « Je ne sais pas ».",
    saving: "Enregistrement…",
    saved: "Enregistré",
    retry: "Réessayer",
    network: "Connexion interrompue. Vos réponses déjà enregistrées sont conservées.",
    invalid: "Cette session n'est plus disponible. Vous pouvez recommencer.",
    restart: "Recommencer",
    transition: ["Analyse de votre maturité carbone…", "Évaluation de la disponibilité de vos données…", "Identification de vos priorités…"],
    resultKicker: "Votre Diagnostic Carbone 360°",
    maturity: "Maturité carbone",
    data: "Disponibilité de vos données",
    dataHelp: "Ce score décrit si les informations utiles à une mesure sont déjà disponibles. Il ne représente pas des émissions.",
    priorities: "Vos priorités",
    nextStep: "Prochaine étape",
    report: "Recevoir mon rapport gratuit",
    name: "Nom et prénom",
    company: "Entreprise",
    email: "Email professionnel",
    consent: "J'accepte de recevoir des informations et actualités de CarboScan.",
    privacy: "Politique de confidentialité",
    send: "Demander le rapport",
    sent: "Votre demande de rapport est enregistrée. Elle ne dépend pas de l'inscription aux actualités.",
    download: "Télécharger le PDF",
    claim: "Conserver dans mon espace",
    claimed: "Ce diagnostic est rattaché à votre espace.",
    signIn: "Créer un compte pour conserver ce diagnostic",
    high: "Priorité haute",
    medium: "Priorité moyenne",
    low: "Priorité basse",
    quantity: "Valeur",
  },
  en: {
    kicker: "Carbon Diagnostic 360°",
    meta: "≈ 5 min · Personalised diagnostic · Free report",
    h1: "Assess your company's carbon maturity",
    lead: "In a few minutes, identify your maturity level, how ready your data is, and your main decarbonisation priorities.",
    start: "Start my diagnostic",
    benefits: [
      ["Assess your maturity", "See where your organisation stands in its carbon journey."],
      ["Assess your data", "See whether you already have the information needed to measure emissions."],
      ["Identify your priorities", "Get the first actions to take."],
    ],
    disclaimer: "This diagnostic evaluates maturity. It is not a greenhouse gas inventory.",
    profile: "Your organisation",
    progress: (pct: number) => `${pct}% complete`,
    previous: "Back",
    next: "Continue",
    see: "See my diagnostic",
    unknownHelp: "You can continue even if some information is not available yet.",
    needAnswer: "Choose an answer to continue.",
    needNumber: "Enter a value or choose “I don't know”.",
    saving: "Saving…",
    saved: "Saved",
    retry: "Retry",
    network: "Connection interrupted. Answers already saved are kept.",
    invalid: "This session is no longer available. You can start again.",
    restart: "Start again",
    transition: ["Analysing your carbon maturity…", "Assessing how ready your data is…", "Identifying your priorities…"],
    resultKicker: "Your Carbon Diagnostic 360°",
    maturity: "Carbon maturity",
    data: "Data availability",
    dataHelp: "This score describes whether the information needed for a measurement is already available. It is not an emission total.",
    priorities: "Your priorities",
    nextStep: "Next step",
    report: "Receive my free report",
    name: "Full name",
    company: "Company",
    email: "Work email",
    consent: "I agree to receive news and updates from CarboScan.",
    privacy: "Privacy policy",
    send: "Request the report",
    sent: "Your report request is saved. It does not depend on signing up for news.",
    download: "Download the PDF",
    claim: "Save in my workspace",
    claimed: "This diagnostic is linked to your workspace.",
    signIn: "Create an account to keep this diagnostic",
    high: "High priority",
    medium: "Medium priority",
    low: "Low priority",
    quantity: "Value",
  },
} as const;

function ui(language: string) {
  return language.startsWith("en") ? copy.en : copy.fr;
}

function apiLanguage(language: string): "fr" | "en" | "de" | "es" {
  if (language.startsWith("en")) return "en";
  if (language.startsWith("de")) return "de";
  if (language.startsWith("es")) return "es";
  return "fr";
}

export function DiagnosticExperience({ language = "fr" }: { language?: string }) {
  const text = ui(language);
  const english = language.startsWith("en");
  const navigate = useNavigate();
  const auth = useOptionalAuth();
  const [phase, setPhase] = useState<Phase>("loading");
  const [session, setSession] = useState<SessionView | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cursorCode, setCursorCode] = useState<string | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [multi, setMulti] = useState<string[]>([]);
  const [quantity, setQuantity] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [reportSent, setReportSent] = useState<{ marketingConsent: boolean; companyName: string } | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [narrow, setNarrow] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const completing = useRef(false);
  const busy = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const pendingSave = useRef<(() => Promise<void>) | null>(null);

  function remember(next: SessionView, resumeToken: string) {
    setSession(next);
    setToken(resumeToken);
    writeResume({ sessionId: next.sessionId, resumeToken });
  }

  function showQuestion(next: SessionView, code: string | null) {
    const questions = next.shownQuestions;
    const existing = questions.find((question) => question.code === code) ?? questions[0];
    setCursorCode(existing?.code ?? null);
    const selected = existing ? selectionFromAnswer(shownAnswer(next.answers, existing)) : selectionFromAnswer(null);
    setChoice(selected.choice);
    setMulti(selected.multi);
    setQuantity(selected.quantity);
    setPhase("questions");
  }

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const apply = () => setNarrow(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const saved = readResume();
    if (!saved) {
      setPhase("intro");
      return;
    }
    readDiagnostic(saved.sessionId, saved.resumeToken)
      .then((view) => {
        remember(view, saved.resumeToken);
        if (view.status === "completed" && view.result) {
          setPhase("result");
          return;
        }
        const index = firstUnansweredIndex(view.shownQuestions, view.answers);
        showQuestion(view, view.shownQuestions[index]?.code ?? null);
      })
      .catch((reason: unknown) => {
        clearResume();
        setPhase(reason instanceof DiagnosticRequestError && reason.status === 404 ? "invalid" : "intro");
        if (!(reason instanceof DiagnosticRequestError) || reason.status !== 404) {
          setError(text.network);
        }
      });
    // Resume once on entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === "questions") headingRef.current?.focus();
  }, [phase, cursorCode]);

  useEffect(() => {
    const abandon = () => {
      if (phaseRef.current !== "questions" || !session) return;
      trackDiagnostic("diagnostic_abandoned", { template_version: session.templateVersion });
    };
    window.addEventListener("pagehide", abandon);
    return () => window.removeEventListener("pagehide", abandon);
  }, [session]);

  const questions = session?.shownQuestions ?? [];
  const index = questions.findIndex((question) => question.code === cursorCode);
  const question = index >= 0 ? questions[index] : undefined;
  const percent = progressPercent(session?.progress ?? { answered: 0, total: 0 });
  const isLast = question != null && index === questions.length - 1;

  async function start() {
    setError(null);
    setSaveState("saving");
    try {
      const created = await createDiagnostic(apiLanguage(language));
      remember(created, created.resumeToken);
      trackDiagnostic("diagnostic_started", { template_version: created.templateVersion });
      showQuestion(created, created.shownQuestions[0]?.code ?? null);
      setSaveState("saved");
    } catch {
      setSaveState("error");
      setError(text.network);
      setPhase("intro");
    }
  }

  async function persist(current: PublicQuestion, then: "forward" | "back") {
    if (!session || !token || busy.current) return;
    const answer = buildAnswer(current, { choice, multi, quantity });
    if (!answer && then !== "back") {
      setError(current.type === "number" ? text.needNumber : text.needAnswer);
      return;
    }
    busy.current = true;
    const run = async () => {
      setSaveState("saving");
      setError(null);
      let view = session;
      if (answer) {
        view = await saveDiagnosticAnswers(session.sessionId, token, { [current.code]: answer });
        remember(view, token);
        trackDiagnostic("diagnostic_answered", {
          template_version: view.templateVersion,
          question_code: current.code,
          axis_id: current.axisId ?? undefined,
          question_type: current.type,
          answer_kind: answer.kind,
        });
      }
      const nextQuestions = view.shownQuestions;
      const nextIndex = indexAfterSave(current.code, nextQuestions);
      const nextQuestion = nextQuestions[nextIndex] ?? null;
      const stillLast = nextQuestions[nextQuestions.length - 1]?.code === current.code;
      const leaving = stillLast || then === "back" ? null : nextQuestion;
      const completedAxis = then === "back" ? null : axisJustCompleted(current, leaving);
      if (then === "back") {
        showQuestion(view, nextQuestions[indexBefore(current.code, nextQuestions)]?.code ?? null);
        setSaveState("saved");
        return;
      }
      if (completedAxis) {
        trackDiagnostic("diagnostic_axis_completed", { template_version: view.templateVersion, axis_id: completedAxis });
      }
      if (stillLast) {
        await finish(view);
        return;
      }
      showQuestion(view, nextQuestion?.code ?? null);
      setSaveState("saved");
    };
    pendingSave.current = run;
    try {
      await run();
    } catch (reason) {
      setSaveState("error");
      setError(text.network);
      if (reason instanceof DiagnosticRequestError && reason.code === "incomplete") {
        const missing = reason.missing[0];
        if (missing) showQuestion(session, missing);
      }
    } finally {
      if (!completing.current) busy.current = false;
    }
  }

  async function finish(view: SessionView) {
    if (!token || completing.current) return;
    completing.current = true;
    setPhase("transition");
    setError(null);
    try {
      const done = await completeDiagnostic(view.sessionId, token);
      const snapshot = done.snapshot;
      if (!snapshot) throw new DiagnosticRequestError(500, "empty_result", "Résultat indisponible.");
      const completed: SessionView = { ...view, status: "completed", result: snapshot };
      remember(completed, token);
      trackDiagnostic("diagnostic_completed", {
        template_version: snapshot.templateVersion,
        reliability: snapshot.reliability,
        reliability_limited: snapshot.reliabilityLimited,
        maturity_level: snapshot.maturityLevel ?? undefined,
      });
      setPhase("result");
    } catch (reason) {
      completing.current = false;
      if (reason instanceof DiagnosticRequestError && reason.code === "incomplete" && reason.missing[0]) {
        showQuestion(view, reason.missing[0]);
        setError(text.needAnswer);
        return;
      }
      setSaveState("error");
      setError(text.network);
      setPhase("questions");
    } finally {
      completing.current = false;
    }
  }

  async function sendReport(form: FormData) {
    if (!session || !token || reportBusy) return;
    setReportBusy(true);
    setReportError(null);
    const fullName = String(form.get("fullName") ?? "").trim();
    const companyName = String(form.get("companyName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const marketingConsent = form.get("marketingConsent") === "on";
    try {
      const result = await requestDiagnosticReport(session.sessionId, token, {
        fullName,
        companyName,
        email,
        ...(marketingConsent ? { marketingConsent: true } : {}),
      });
      setReportSent({ marketingConsent: result.marketingConsent, companyName });
      trackDiagnostic("diagnostic_report_requested", {
        template_version: session.templateVersion,
        marketing_consent: result.marketingConsent,
      });
    } catch {
      setReportError(text.network);
    } finally {
      setReportBusy(false);
    }
  }

  async function claimCurrent() {
    if (!session || !token || claimed) return;
    try {
      await claimDiagnostic(session.sessionId, token);
      setClaimed(true);
      trackDiagnostic("diagnostic_claimed", { template_version: session.templateVersion });
    } catch {
      setError(text.network);
    }
  }

  async function downloadReport() {
    if (!session?.result) return;
    await downloadDiagnosticPdf({
      snapshot: session.result,
      companyName: reportSent?.companyName,
      completedAt: session.completedAt,
    });
    trackDiagnostic("diagnostic_report_downloaded", { template_version: session.templateVersion });
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:py-16">
      {phase === "loading" && <p className="text-[#52615C]">…</p>}
      {phase === "invalid" && (
        <section className="mx-auto max-w-xl rounded-2xl border border-[#E4EBE7] bg-white p-8">
          <p role="alert" className="text-[#073D30]">{text.invalid}</p>
          <button type="button" className={primaryBtn} onClick={() => { clearResume(); setPhase("intro"); setError(null); }}>
            {text.restart}
          </button>
        </section>
      )}
      {phase === "intro" && (
        <Intro text={text} error={error} saving={saveState === "saving"} onStart={() => void start()} />
      )}
      {phase === "questions" && question && (
        <QuestionStep
          text={text}
          english={english}
          question={question}
          percent={percent}
          isFirst={index <= 0}
          isLast={isLast}
          choice={choice}
          multi={multi}
          quantity={quantity}
          saveState={saveState}
          error={error}
          headingRef={headingRef}
          onChoice={(value) => {
            setChoice(value);
            if (value !== "unknown") setError(null);
            if (question.type === "multi" && value === "unknown") setMulti([]);
            if (value !== "unknown" && question.type !== "multi") setChoice(value);
          }}
          onMulti={(value) => {
            setChoice(null);
            setMulti((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
          }}
          onQuantity={setQuantity}
          onPrevious={() => {
            if (!question) return;
            const existing = shownAnswer(session?.answers ?? {}, question);
            const nextAnswer = buildAnswer(question, { choice, multi, quantity });
            const changed = JSON.stringify(existing) !== JSON.stringify(nextAnswer);
            if (changed && nextAnswer) void persist(question, "back");
            else if (session) showQuestion(session, questions[indexBefore(question.code, questions)]?.code ?? question.code);
          }}
          onContinue={() => void persist(question, "forward")}
          onRetry={() => {
            const retry = pendingSave.current;
            if (retry) void retry().catch(() => setSaveState("error"));
          }}
        />
      )}
      {phase === "transition" && (
        <section className="mx-auto max-w-xl space-y-3 py-16" aria-live="polite">
          {text.transition.map((line) => (
            <p key={line} className="text-lg text-[#073D30]">{line}</p>
          ))}
        </section>
      )}
      {phase === "result" && session?.result && (
        <Result
          text={text}
          english={english}
          snapshot={session.result}
          narrow={narrow}
          reportSent={reportSent}
          reportError={reportError}
          reportBusy={reportBusy}
          claimed={claimed}
          signedIn={Boolean(auth?.user)}
          onReport={(form) => void sendReport(form)}
          onDownload={() => void downloadReport()}
          onClaim={() => void claimCurrent()}
          onCta={(href, module) => {
            trackDiagnostic("diagnostic_cta_clicked", { template_version: session.templateVersion, module });
            navigate(href);
          }}
        />
      )}
    </div>
  );
}

const primaryBtn = "mt-6 inline-flex h-12 items-center justify-center rounded-[4px] bg-[#075C43] px-6 text-[15px] font-semibold text-white hover:bg-[#054C37] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075C43] disabled:opacity-60";
const secondaryBtn = "inline-flex h-12 items-center justify-center rounded-[4px] border border-[#075C43] px-6 text-[15px] font-semibold text-[#075C43] hover:bg-[#E8F4EE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075C43]";

function Intro({
  text,
  error,
  saving,
  onStart,
}: {
  text: (typeof copy)["fr"];
  error: string | null;
  saving: boolean;
  onStart: () => void;
}) {
  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#087354]">{text.kicker}</p>
      <h1 className="font-hero-display mt-4 text-4xl leading-[1.05] text-[#073D30] sm:text-5xl">{text.h1}</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#52615C]">{text.lead}</p>
      <p className="mt-4 text-sm font-medium text-[#075C43]">{text.meta}</p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-3">
        {text.benefits.map(([title, body]) => (
          <li key={title} className="rounded-2xl border border-[#E4EBE7] bg-white p-5">
            <h2 className="text-base font-semibold text-[#073D30]">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#52615C]">{body}</p>
          </li>
        ))}
      </ul>
      <p className="mt-8 max-w-2xl text-sm leading-relaxed text-[#52615C]">{text.disclaimer}</p>
      {error && <p role="alert" className="mt-4 text-sm text-[#8A3B2C]">{error}</p>}
      <button type="button" className={primaryBtn} onClick={onStart} disabled={saving}>
        {text.start}
      </button>
    </section>
  );
}

function QuestionStep(props: {
  text: (typeof copy)["fr"];
  english: boolean;
  question: PublicQuestion;
  percent: number;
  isFirst: boolean;
  isLast: boolean;
  choice: string | null;
  multi: string[];
  quantity: string;
  saveState: SaveState;
  error: string | null;
  headingRef: RefObject<HTMLHeadingElement>;
  onChoice: (value: string) => void;
  onMulti: (value: string) => void;
  onQuantity: (value: string) => void;
  onPrevious: () => void;
  onContinue: () => void;
  onRetry: () => void;
}) {
  const { text, english, question } = props;
  const { main, unknown } = splitOptions(question);
  const axis = axisText(question, english) ?? text.profile;
  const selectedUnknown = props.choice === "unknown";
  return (
    <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,42rem)_16rem] lg:items-start">
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#087354]">{text.kicker}</p>
        <div className="mt-4">
          <div className="flex items-center justify-between gap-4 text-sm text-[#52615C]">
            <span>{text.progress(props.percent)}</span>
            <span aria-live="polite">
              {props.saveState === "saving" && text.saving}
              {props.saveState === "saved" && text.saved}
              {props.saveState === "error" && (
                <button type="button" className="underline" onClick={props.onRetry}>{text.retry}</button>
              )}
            </span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E4EBE7]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={props.percent}
            aria-label={text.progress(props.percent)}
          >
            <div className="h-full bg-[#075C43]" style={{ width: `${props.percent}%` }} />
          </div>
        </div>
        <p className="mt-8 text-sm font-semibold text-[#075C43]">{axis}</p>
        <h2 ref={props.headingRef} tabIndex={-1} className="mt-2 text-2xl font-semibold leading-snug text-[#073D30] outline-none sm:text-3xl">
          {questionText(question, english)}
        </h2>
        {question.type === "number" ? (
          <NumberField
            label={text.quantity}
            value={props.quantity}
            disabled={selectedUnknown}
            onChange={props.onQuantity}
          />
        ) : (
          <div role={question.type === "multi" ? "group" : "radiogroup"} aria-labelledby="" className="mt-6 grid gap-3">
            {main.map((option) => {
              const pressed = question.type === "multi" ? props.multi.includes(option.value) : props.choice === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role={question.type === "multi" ? "checkbox" : "radio"}
                  aria-checked={pressed}
                  onClick={() => (question.type === "multi" ? props.onMulti(option.value) : props.onChoice(option.value))}
                  className={`min-h-12 rounded-2xl border px-4 py-3 text-left text-[15px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075C43] ${pressed ? "border-[#075C43] bg-[#E7F3EC] text-[#073D30]" : "border-[#E4EBE7] bg-white text-[#073D30]"}`}
                >
                  {optionText(option, english)}
                </button>
              );
            })}
          </div>
        )}
        {unknown && (
          <button
            type="button"
            aria-pressed={selectedUnknown}
            onClick={() => props.onChoice(selectedUnknown ? "" : "unknown")}
            className={`mt-4 min-h-12 w-full rounded-2xl border border-dashed px-4 py-3 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075C43] ${selectedUnknown ? "border-[#52615C] bg-[#F4F6F5] text-[#073D30]" : "border-[#C9D4CF] bg-transparent text-[#52615C]"}`}
          >
            {optionText(unknown, english)}
          </button>
        )}
        {props.error && <p role="alert" className="mt-4 text-sm text-[#8A3B2C]">{props.error}</p>}
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <button type="button" className={secondaryBtn} onClick={props.onPrevious} disabled={props.isFirst}>
            {text.previous}
          </button>
          <button type="button" className={primaryBtn + " mt-0"} onClick={props.onContinue} disabled={props.saveState === "saving"}>
            {props.isLast ? text.see : text.next}
          </button>
        </div>
      </div>
      {unknown && (
        <aside className="rounded-2xl bg-[#F4F6F5] p-4 text-sm leading-relaxed text-[#52615C] lg:mt-28">
          {text.unknownHelp}
        </aside>
      )}
    </section>
  );
}

function NumberField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const parsed = parseQuantity(value);
  return (
    <label className="mt-6 block text-sm font-medium text-[#073D30]">
      {label}
      <input
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => {
          if (parsed != null) onChange(formatQuantity(parsed));
        }}
        className="mt-2 h-12 w-full rounded-xl border border-[#E4EBE7] px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#075C43] disabled:bg-[#F4F6F5]"
      />
    </label>
  );
}

function Result({
  text,
  english,
  snapshot,
  narrow,
  reportSent,
  reportError,
  reportBusy,
  claimed,
  signedIn,
  onReport,
  onDownload,
  onClaim,
  onCta,
}: {
  text: (typeof copy)["fr"];
  english: boolean;
  snapshot: PublicSnapshot;
  narrow: boolean;
  reportSent: { marketingConsent: boolean; companyName: string } | null;
  reportError: string | null;
  reportBusy: boolean;
  claimed: boolean;
  signedIn: boolean;
  onReport: (form: FormData) => void;
  onDownload: () => void;
  onClaim: () => void;
  onCta: (href: string, module: string) => void;
}) {
  const presentation = snapshot.presentation;
  const limited = snapshot.reliabilityLimited;
  const qualifier = english ? presentation.scoreQualifierEn : presentation.scoreQualifierFr;
  const level = limited
    ? (english ? presentation.displayLevelEn : presentation.displayLevelFr)
    : (english ? presentation.levelLabelEn : presentation.levelLabelFr);
  const warning = english ? presentation.reliabilityWarningEn : presentation.reliabilityWarningFr;
  const recommendations = snapshot.recommendations.slice(0, 3);
  const primary = recommendations[0];
  const primaryLink = primary ? moduleLink(primary.module, english) : null;
  const chart = snapshot.axisScores.map((axis) => ({
    axis: (english ? RESULT_AXIS_LABELS[axis.axisId]?.en : RESULT_AXIS_LABELS[axis.axisId]?.fr) ?? axis.axisId,
    score: axis.maturity ?? 0,
    missing: axis.maturity == null,
  }));
  const priorityLabel = { high: text.high, medium: text.medium, low: text.low };

  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#087354]">{text.resultKicker}</p>
      <h1 className="mt-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#52615C]">
        {limited ? qualifier : text.maturity}
      </h1>
      <p className="mt-2 font-hero-display text-6xl text-[#073D30]">{snapshot.maturityScore ?? "—"}<span className="text-2xl text-[#52615C]"> / 100</span></p>
      <p className="mt-3 text-xl text-[#073D30]">{level}</p>
      {limited && warning && (
        <p role="alert" className="mt-4 rounded-2xl border border-[#E7D7A8] bg-[#FBF6EA] p-4 text-sm leading-relaxed text-[#073D30]">
          {warning}
        </p>
      )}
      <h2 className="mt-10 text-sm font-semibold uppercase tracking-[0.14em] text-[#52615C]">{text.data}</h2>
      <p className="mt-2 text-4xl text-[#073D30]">{snapshot.dataReadinessScore ?? "—"}<span className="text-xl text-[#52615C]"> / 100</span></p>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#52615C]">{text.dataHelp}</p>
      <div className="mt-8 h-72">
        {narrow ? (
          <ul className="space-y-3">
            {chart.map((item) => (
              <li key={item.axis}>
                <div className="flex justify-between text-sm text-[#073D30]">
                  <span>{item.axis}</span>
                  <span>{item.missing ? "—" : item.score}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-[#E4EBE7]">
                  <div className="h-full rounded-full bg-[#075C43]" style={{ width: `${item.score}%` }} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chart}>
              <PolarGrid />
              <PolarAngleAxis dataKey="axis" tick={{ fill: "#073D30", fontSize: 12 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="score" stroke="#075C43" fill="#087354" fillOpacity={0.35} />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>
      <h2 className="mt-4 text-xl font-semibold text-[#073D30]">{text.priorities}</h2>
      <ol className="mt-4 space-y-4">
        {recommendations.map((item) => {
          const link = moduleLink(item.module, english);
          return (
            <li key={item.id} className="rounded-2xl border border-[#E4EBE7] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#087354]">{priorityLabel[item.priority]}</p>
              <h3 className="mt-2 text-lg font-semibold text-[#073D30]">{english ? item.titleEn : item.titleFr}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#52615C]">{english ? item.bodyEn : item.bodyFr}</p>
              {link && <p className="mt-3 text-sm font-medium text-[#075C43]">{text.nextStep} : {link.label}</p>}
            </li>
          );
        })}
      </ol>
      {primary && primaryLink && (
        <button type="button" className={primaryBtn} onClick={() => onCta(primaryLink.href, primary.module)}>
          {primaryLink.label}
        </button>
      )}
      <div className="mt-12 rounded-2xl border border-[#E4EBE7] bg-white p-6">
        <h2 className="text-lg font-semibold text-[#073D30]">{text.report}</h2>
        {reportSent ? (
          <div className="mt-3 space-y-3">
            <p role="status" className="text-sm text-[#073D30]">{text.sent}</p>
            <button type="button" className={primaryBtn} onClick={onDownload}>{text.download}</button>
          </div>
        ) : (
          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (reportBusy) return;
              onReport(new FormData(event.currentTarget));
            }}
          >
            <label className="text-sm text-[#073D30]">{text.name}
              <input name="fullName" required autoComplete="name" className="mt-1 h-12 w-full rounded-xl border border-[#E4EBE7] px-3" />
            </label>
            <label className="text-sm text-[#073D30]">{text.company}
              <input name="companyName" required autoComplete="organization" className="mt-1 h-12 w-full rounded-xl border border-[#E4EBE7] px-3" />
            </label>
            <label className="text-sm text-[#073D30]">{text.email}
              <input name="email" type="email" required autoComplete="email" className="mt-1 h-12 w-full rounded-xl border border-[#E4EBE7] px-3" />
            </label>
            <label className="mt-2 flex items-start gap-3 text-sm text-[#52615C]">
              <input name="marketingConsent" type="checkbox" className="mt-1 h-4 w-4" />
              <span>{text.consent}</span>
            </label>
            <a href="/privacy-policy" className="text-sm text-[#075C43] underline">{text.privacy}</a>
            {reportError && <p role="alert" className="text-sm text-[#8A3B2C]">{reportError}</p>}
            <button type="submit" className={primaryBtn} disabled={reportBusy}>{reportBusy ? text.saving : text.send}</button>
          </form>
        )}
        <div className="mt-6">
          {claimed ? (
            <p className="text-sm text-[#073D30]">{text.claimed}</p>
          ) : signedIn ? (
            <button type="button" className="text-sm font-semibold text-[#075C43] underline" onClick={onClaim}>{text.claim}</button>
          ) : (
            <a href="/auth?redirect=/bilan-gratuit" className="text-sm font-semibold text-[#075C43] underline">{text.signIn}</a>
          )}
        </div>
      </div>
    </section>
  );
}
