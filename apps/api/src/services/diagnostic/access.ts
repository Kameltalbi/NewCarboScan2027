import { createHash, timingSafeEqual } from "node:crypto";
import { AXES, QUESTIONS } from "./catalog.js";
import { isVisible, shownQuestions } from "./engine.js";
import type {
  AnswerMap,
  DiagnosticAnswer,
  DiagnosticQuestion,
  DiagnosticSnapshot,
} from "./types.js";

export type PublicQuestion = {
  code: string;
  type: DiagnosticQuestion["type"];
  labelFr: string;
  labelEn: string;
  /** Null for profile questions that do not belong to a scored axis. */
  axisId: DiagnosticQuestion["axisId"];
  axisLabelFr: string | null;
  axisLabelEn: string | null;
  options: Array<{ value: string; labelFr: string; labelEn: string }>;
};

export type PublicSnapshot = Omit<DiagnosticSnapshot, "internal"> & {
  applicableAnswers: AnswerMap;
};

export function hashResumeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function resumeTokenMatches(storedHash: string, token: string): boolean {
  const presented = hashResumeToken(token);
  const left = Buffer.from(storedHash);
  const right = Buffer.from(presented);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function toPublicQuestion(question: DiagnosticQuestion): PublicQuestion {
  const axis = question.axisId ? AXES.find((item) => item.id === question.axisId) : undefined;
  return {
    code: question.code,
    type: question.type,
    labelFr: question.labelFr,
    labelEn: question.labelEn,
    axisId: question.axisId,
    axisLabelFr: axis?.labelFr ?? null,
    axisLabelEn: axis?.labelEn ?? null,
    options: question.options.map((option) => ({
      value: option.value,
      labelFr: option.labelFr,
      labelEn: option.labelEn,
    })),
  };
}

export function publicQuestions(answers: AnswerMap): PublicQuestion[] {
  return shownQuestions(answers).map(toPublicQuestion);
}

/** Stored answers that the current branching still shows. Hidden answers stay in storage. */
export function applicableAnswers(stored: AnswerMap): AnswerMap {
  const visible = new Set(shownQuestions(stored).map((question) => question.code));
  const applicable: AnswerMap = {};
  for (const [code, answer] of Object.entries(stored)) {
    if (visible.has(code)) applicable[code] = answer;
  }
  return applicable;
}

export function progressOf(stored: AnswerMap): { answered: number; total: number } {
  const shown = shownQuestions(stored);
  const applicable = applicableAnswers(stored);
  return {
    answered: shown.filter((question) => applicable[question.code]).length,
    total: shown.length,
  };
}

export function toPublicSnapshot(
  snapshot: DiagnosticSnapshot,
  applicable: AnswerMap,
): PublicSnapshot {
  const { internal: _internal, ...rest } = snapshot;
  return { ...rest, applicableAnswers: applicable };
}

export function normalizeAnswer(
  question: DiagnosticQuestion,
  answer: DiagnosticAnswer,
): { ok: true; value: DiagnosticAnswer } | { ok: false } {
  const allowsUnknown = question.options.some((option) => option.value === "unknown");
  if (answer.kind === "unknown") {
    return allowsUnknown ? { ok: true, value: { kind: "unknown" } } : { ok: false };
  }
  if (answer.kind === "number") {
    return question.type === "number" ? { ok: true, value: answer } : { ok: false };
  }
  if (answer.kind === "multi") {
    if (question.type !== "multi") return { ok: false };
    const allowed = new Set(question.options.map((option) => option.value));
    const unique = new Set(answer.values);
    if (unique.size !== answer.values.length) return { ok: false };
    if (answer.values.some((value) => value === "unknown" || !allowed.has(value))) {
      return { ok: false };
    }
    return { ok: true, value: { kind: "multi", values: [...answer.values] } };
  }
  if (question.type !== "single") return { ok: false };
  const known = question.options.some((option) => option.value === answer.value);
  if (!known) return { ok: false };
  if (answer.value === "unknown" && allowsUnknown) {
    return { ok: true, value: { kind: "unknown" } };
  }
  return { ok: true, value: { kind: "choice", value: answer.value } };
}

export type AnswerPlan =
  | { ok: true; stored: AnswerMap }
  | { ok: false; code: "unknown_question" | "question_not_in_path" | "invalid_answer"; question: string };

/**
 * Applies incoming answers in catalog order on top of the stored map.
 * A question that is not on the path after earlier keys in the same payload
 * rejects the whole update. Nothing is written by the caller in that case.
 */
export function planAnswerUpdate(stored: AnswerMap, incoming: AnswerMap): AnswerPlan {
  const known = new Set(QUESTIONS.map((question) => question.code));
  for (const code of Object.keys(incoming)) {
    if (!known.has(code)) return { ok: false, code: "unknown_question", question: code };
  }
  const working: AnswerMap = { ...stored };
  for (const question of QUESTIONS) {
    const next = incoming[question.code];
    if (!next) continue;
    if (!isVisible(question.code, working)) {
      return { ok: false, code: "question_not_in_path", question: question.code };
    }
    const normalized = normalizeAnswer(question, next);
    if (!normalized.ok) return { ok: false, code: "invalid_answer", question: question.code };
    working[question.code] = normalized.value;
  }
  return { ok: true, stored: working };
}
