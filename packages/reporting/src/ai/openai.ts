import {
  assertEveryNumberInTextExistsInStructuredFacts,
  assertNoInventedClimateClaims,
} from "@newcarboscan/carbon-engine";
import {
  BANNED_PHRASES,
  PROMPT_VERSION,
  SYSTEM_PROMPT,
  type NarrativeDraft,
  type NarrativeProvider,
  type NarrativeRequest,
  type NarrativeUsage,
} from "./contract.js";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4.1-mini";
const TIMEOUT_MS = 45_000;
const RETRIES = 2;

export interface NarrativeCache {
  get(key: string): Promise<string | null>;
  set(key: string, text: string): Promise<void>;
}

export interface OpenAiOptions {
  cache?: NarrativeCache | null;
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
}

interface Completion {
  text: string;
  usage: NarrativeUsage | null;
}

/**
 * Client serveur. La clé est lue dans l'environnement du process, jamais écrite.
 * allowNetwork doit être passé par l'appelant serveur.
 */
export class OpenAiNarrativeProvider implements NarrativeProvider {
  constructor(private readonly options: OpenAiOptions = {}) {}

  async draft(request: NarrativeRequest): Promise<NarrativeDraft> {
    if (!request.allowNetwork) {
      throw new Error("Appel OpenAI refusé : le serveur n'a pas autorisé le réseau.");
    }
    const env = this.options.env ?? process.env;
    const key = env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY absent du serveur.");
    const model = env.OPENAI_MODEL || DEFAULT_MODEL;
    const allowed = Object.values(request.facts);

    const cacheKey = `${PROMPT_VERSION}:${request.slot}:${request.slotKey}:${JSON.stringify(request.brief.dossier)}`;
    const cached = this.options.cache ? await this.options.cache.get(cacheKey) : null;
    let correction = "";
    let text = cached;
    let usage: NarrativeUsage | null = null;
    let lastProblem: string | null = null;
    if (!text) {
      for (let attempt = 0; attempt <= 3; attempt += 1) {
        const completion = await complete(key, model, request, correction, this.options.fetchImpl);
        usage = completion.usage;
        const composed = composeAnswer(protectYearRanges(completion.text));
        text = composed.text;
        if (!composed.problem && text) {
          const problem = draftProblem(request, text, allowed);
          if (!problem) break;
          correction = problem;
          lastProblem = problem;
        } else {
          correction = composed.problem ?? "Réponse inutilisable.";
          lastProblem = correction;
        }
        text = "";
      }
      if (text && this.options.cache) await this.options.cache.set(cacheKey, text);
    }
    if (!text || draftProblem(request, text, allowed)) {
      return {
        slot: request.slot,
        slotKey: request.slotKey,
        promptVersion: PROMPT_VERSION,
        provider: "openai",
        status: "rejected",
        originalText: request.fallbackText,
        editedText: null,
        model,
        usage,
        failureReason: lastProblem,
      };
    }
    return {
      slot: request.slot,
      slotKey: request.slotKey,
      promptVersion: PROMPT_VERSION,
      provider: "openai",
      status: "generated",
      originalText: text,
      editedText: null,
      model,
      usage,
      failureReason: null,
    };
  }
}

function publicDossier(request: NarrativeRequest): Record<string, unknown> {
  if (request.slot === "recommendation") {
    const { objectifConnu: _hypothesis, potentielTco2e: _potential, horizon: _horizon, indicateur: _indicator, partHypothesePct: _share, ...rest } =
      request.brief.dossier;
    return {
      ...rest,
      dejaImprime: "L'hypothèse, le potentiel, l'horizon et l'indicateur sont déjà sur la fiche. Ne les cite pas.",
    };
  }
  if (request.slot === "scope_analysis") {
    const { emissionsTco2e: _tonnes, partDuTotalPct: _share, postes, postesMesuresNuls, ...rest } = request.brief.dossier;
    const hide = (post: unknown) => {
      if (!post || typeof post !== "object") return post;
      const { emissionsTco2e: _a, partDuTotalPct: _b, ...kept } = post as Record<string, unknown>;
      return kept;
    };
    return {
      ...rest,
      postes: Array.isArray(postes) ? postes.map(hide) : postes,
      postesMesuresNuls: Array.isArray(postesMesuresNuls) ? postesMesuresNuls.map(hide) : postesMesuresNuls,
      dejaDansLeTableau: "Le total du scope et les tonnages des postes sont déjà imprimés. Ne les répète pas.",
    };
  }
  if (request.slot === "significant_post" && request.brief.dossier.poste && typeof request.brief.dossier.poste === "object") {
    const { emissionsTco2e: _tonnes, partDuTotalPct: _share, ...poste } = request.brief.dossier.poste as Record<string, unknown>;
    return {
      ...request.brief.dossier,
      poste,
      dejaDansLeTableau: "Le tonnage et la part sont déjà imprimés. Ne les répète pas.",
    };
  }
  return request.brief.dossier;
}

function draftProblem(request: NarrativeRequest, text: string, allowed: string[]): string | null {
  return rejectReason(text, allowed, request.brief.mustMention) ?? lengthProblem(request.slot, text) ?? repetitionProblem(request, text) ?? technicalProblem(request, text);
}

function repetitionProblem(request: NarrativeRequest, text: string): string | null {
  if (request.slot === "scope_analysis") {
    const tonnes = String(request.brief.dossier.emissionsTco2e ?? "");
    if (tonnes && text.includes(tonnes)) {
      return "Ne répète pas le total du scope : il est dans le tableau juste après. Décris le poste dominant et la limite.";
    }
    if (/significatif/i.test(text)) {
      return "Ne qualifie aucun poste de significatif dans ce passage. Décris le poste dominant et la limite de donnée.";
    }
    const scope = Number(request.brief.dossier.scope);
    for (const other of [1, 2, 3]) {
      if (other !== scope && new RegExp(`scope\\s*${other}\\b`, "i").test(text)) {
        return `Ne parle pas du scope ${other}. Ce passage porte uniquement sur le scope ${scope}.`;
      }
    }
  }
  if (request.slot === "significant_post" && request.brief.dossier.poste && typeof request.brief.dossier.poste === "object") {
    const poste = request.brief.dossier.poste as Record<string, unknown>;
    const figures = [poste.emissionsTco2e, poste.partDuTotalPct].filter((value) => value !== null && value !== undefined).map(String);
    if (figures.some((value) => value.length > 0 && text.includes(value))) {
      return "Ne répète pas le tonnage ni la part déjà affichés dans le tableau. Décris la méthode et la limite.";
    }
    const status = String(poste.statutTemporel ?? "");
    if (status === "Jeu fictif" && /postérieur/i.test(text)) {
      return "Ce facteur est un jeu fictif. Ne le décris pas comme postérieur à l'exercice.";
    }
    if (status === "Postérieur" && /jeu fictif|démonstration/i.test(text)) {
      return "Ce facteur est postérieur à l'exercice. Ne le décris pas comme un facteur de démonstration.";
    }
    if (status === "Non daté" && /postérieur|jeu fictif|démonstration/i.test(text)) {
      return "L'applicabilité temporelle de ce facteur n'est pas appréciable. Ne lui attribue pas un autre statut.";
    }
    const method = String(poste.methode ?? "");
    if (method === "facture" && /monétaire|financi|dépense/i.test(text)) {
      return "La méthode est une facture. Ne la décris pas comme une dépense ou un proxy monétaire.";
    }
    if (method === "facture" && /ne mesure pas|relevé|compteur|suivi direct/i.test(text)) {
      return "La facture porte déjà une quantité physique. Ne dis pas qu'elle ne la mesure pas, et n'invente ni compteur ni suivi.";
    }
    if (method === "proxy monétaire" && /facture/i.test(text)) {
      return "La méthode est un proxy monétaire. Ne la décris pas comme une facture.";
    }
  }
  if (request.slot !== "recommendation") return null;
  const words = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .match(/[a-z0-9]+/g) ?? [];
  const known = [request.brief.dossier.action, request.brief.dossier.poste, request.brief.dossier.nature]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLowerCase());
  let hypothesis = String(request.brief.dossier.objectifConnu ?? "").toLowerCase();
  for (const piece of known) {
    if (piece.length > 3) hypothesis = hypothesis.replaceAll(piece, " ");
  }
  const source = words(hypothesis);
  const target = words(text).join(" ");
  for (let index = 0; index + 6 <= source.length; index += 1) {
    if (target.includes(source.slice(index, index + 6).join(" "))) {
      return "Ne répète pas l'hypothèse déjà inscrite sur la fiche. Dis seulement la limite du levier.";
    }
  }
  if (/\b20\d{2}\b/.test(text)) return "Ne répète pas l'horizon déjà inscrit sur la fiche.";
  const potential = request.brief.dossier.potentielTco2e;
  if (potential !== null && potential !== undefined && text.includes(String(potential))) {
    return "Ne répète pas le potentiel déjà inscrit sur la fiche.";
  }
  return null;
}

const UNSUPPORTED_TECHNIQUE = [
  "chaudière",
  "photovoltaïque",
  "pompe à chaleur",
  "hydrogène",
  "biogaz",
  "camion",
  "flotte",
  "isolation",
  "véhicule électrique",
  "onduleur",
  "compresseur",
];

function technicalProblem(request: NarrativeRequest, text: string): string | null {
  if (request.slot !== "recommendation") return null;
  const lowered = text.toLowerCase();
  const source = JSON.stringify(request.brief.dossier).toLowerCase();
  const invented = UNSUPPORTED_TECHNIQUE.find((word) => lowered.includes(word) && !source.includes(word));
  if (invented) return "Le texte ajoute un équipement ou un procédé absent du dossier.";
  if (/\b(budget|coût|cout|k€|euros?)\b/.test(lowered)) return "Ne cite ni budget ni coût. Aucun n'est dans le dossier.";
  if (/s'engage|décision actée|déjà engagé|solution retenue|sera install/.test(lowered)) {
    return "Ne présente pas la proposition comme un engagement ou une solution déjà retenue.";
  }
  return null;
}

function rejectReason(text: string, allowed: string[], mustMention: string[]): string | null {
  const lowered = text.toLowerCase();
  if (/du total scope|%\s*du scope/.test(lowered)) {
    return "partDuTotalPct est la part du bilan entier, pas la part interne du scope. Reformule sans cette attribution.";
  }
  const banned = BANNED_PHRASES.filter((phrase) => lowered.includes(phrase));
  if (banned.length > 0) {
    return "Le texte ajoute une qualité, un procédé ou un équipement absent du dossier. Reprends uniquement la catégorie, le site, la méthode et la limite déjà fournis.";
  }
  const missing = mustMention.filter((phrase) => !lowered.includes(phrase.toLowerCase()));
  if (missing.length > 0) return `Le dossier exige ces mentions : ${missing.join(", ")}.`;
  const claims = assertNoInventedClimateClaims(text);
  if (!claims.ok) return `Retire ces formulations : ${claims.matches.join(", ")}.`;
  const numbers = assertEveryNumberInTextExistsInStructuredFacts(text, allowed);
  if (!numbers.ok) {
    const hints = numbers.unknownNumbers.map((raw) => {
      const normalized = raw.replace(/\s/g, "").replace(",", ".");
      const fuller = allowed.find((value) => value.startsWith(`${normalized}.`));
      return fuller ? `${raw.trim()} s'écrit ${fuller}` : raw.trim();
    });
    return `Ces nombres ne sont pas autorisés : ${hints.join(" | ")}. Réécris le nombre complet, sans le tronquer.`;
  }
  return null;
}

function composeAnswer(raw: string): { text: string | null; problem: string | null } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(clean(raw));
  } catch {
    return { text: null, problem: "Réponds uniquement par un objet JSON observations, interpretation, recommandations." };
  }
  if (!parsed || typeof parsed !== "object") {
    return { text: null, problem: "Le JSON doit contenir observations, interpretation et recommandations." };
  }
  const body = parsed as Record<string, unknown>;
  if (typeof body.texte === "string" && body.texte.trim().length >= 40) {
    return { text: body.texte.trim(), problem: null };
  }
  const observations = asPhrases(body.observations).slice(0, 2).map((item) => capSentences(item, 2));
  const interpretation = typeof body.interpretation === "string" ? capSentences(body.interpretation.trim(), 2) : "";
  if (observations.length === 0 || interpretation.length < 40) {
    return { text: null, problem: "Ajoute des observations factuelles et une interprétation d'au moins une phrase complète." };
  }
  return { text: [observations.join(" "), interpretation].filter(Boolean).join(" "), problem: null };
}

function lengthProblem(slot: NarrativeRequest["slot"], text: string): string | null {
  const words = text.split(/\s+/).filter(Boolean).length;
  const max = slot === "executive_summary" ? 150 : slot === "scope_analysis" ? 170 : slot === "significant_post" ? 145 : 110;
  if (words > max) return `Texte trop long (${words} mots). Raccourcis, sans répéter le tableau.`;
  if (slot === "significant_post" && /seuil individuel|cible cumulative/i.test(text)) {
    return "N'explique pas le seuil de 5 % ni la cible de 80 %. C'est déjà dit une seule fois dans la synthèse.";
  }
  if (slot === "recommendation" && /émission[s]? évit/i.test(text)) {
    return "Ne parle pas d'émissions évitées. Parle d'un potentiel prospectif, non soustrait de l'inventaire.";
  }
  return null;
}

function capSentences(text: string, maxSentences: number): string {
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts.slice(0, maxSentences).join(" ");
}

function asPhrases(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  return phrases(value);
}

function phrases(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

async function complete(
  key: string,
  model: string,
  request: NarrativeRequest,
  correction: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Completion> {
  let lastError = "échec OpenAI";
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetchImpl(ENDPOINT, {
        method: "POST",
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: request.slot === "recommendation" ? 280 : request.slot === "significant_post" ? 360 : 480,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: JSON.stringify({
                slot: request.slot,
                consigne: request.brief.consigne,
                questions: request.brief.questions,
                dossier: publicDossier(request),
                chiffresAutorises: request.brief.chiffresAutorises,
                mentionsObligatoires: request.brief.mustMention,
                correction,
              }),
            },
          ],
        }),
      });
      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        continue;
      }
      const body = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };
      const text = body.choices?.[0]?.message?.content ?? "";
      if (!text.trim()) {
        lastError = "réponse vide";
        continue;
      }
      return { text, usage: readUsage(body.usage) };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "échec réseau";
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(lastError);
}

function readUsage(usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined): NarrativeUsage | null {
  if (!usage) return null;
  const promptTokens = usage.prompt_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? 0;
  const totalTokens = usage.total_tokens ?? promptTokens + completionTokens;
  if (promptTokens === 0 && completionTokens === 0 && totalTokens === 0) return null;
  return { promptTokens, completionTokens, totalTokens };
}

function protectYearRanges(text: string): string {
  return text.replace(/\b(20\d{2})\s*[-–]\s*(20\d{2})\b/g, "$1 et $2");
}

function clean(text: string): string {
  return text.replace(/```[a-z]*|```/gi, "").trim();
}
