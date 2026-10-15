import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyze } from "../analyze.js";
import { ateliersDuSahel } from "../fixtures/ateliersDuSahel.js";
import { frenchifyNumbers } from "../format.js";
import { assertModelProse } from "../proseGuard.js";
import { DEFAULT_ANALYSIS_OPTIONS } from "../types.js";
import { buildNarrativeBriefs } from "./brief.js";
import { assertReadyToPublish, enrichReport } from "./compose.js";
import type { NarrativeRequest } from "./contract.js";
import { createNarrativeProvider } from "./fallback.js";
import { OpenAiNarrativeProvider } from "./openai.js";

const request: NarrativeRequest = {
  slot: "executive_summary",
  slotKey: "executive",
  facts: { total: "2702.107" },
  context: { passage: "executive" },
  brief: {
    consigne: "Rédiger la synthèse à partir du dossier.",
    questions: ["Quel est le niveau global ?"],
    dossier: { totalTco2e: "2702.107" },
    chiffresAutorises: ["2702.107"],
    mustMention: [],
  },
  fallbackText: "Les émissions inventoriées s'élèvent à 2\u00a0702,107 tCO₂e.",
};

function jsonResponse(content: unknown, usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }], usage }), { status: 200 });
}

const accepted = {
  observations: ["Le total retenu est 2702.107 tCO₂e."],
  interpretation: "Ce niveau est celui de l'inventaire calculé, sans retraitement des postes.",
  recommandations: ["Examiner d'abord le poste le plus élevé du dossier."],
};

describe("rédaction", () => {
  it("publie le repli déterministe sans réseau", async () => {
    const provider = createNarrativeProvider();
    const draft = await provider.draft(request);
    assert.equal(draft.provider, "fallback");
    assert.equal(draft.status, "fallback");
    assert.equal(draft.model, null);
    assert.equal(draft.usage, null);
    assert.match(draft.originalText, /2\u00a0702,107/);
  });

  it("refuse l'appel OpenAI sans autorisation explicite du serveur", async () => {
    const provider = new OpenAiNarrativeProvider({
      fetchImpl: async () => {
        throw new Error("le réseau ne doit pas être contacté");
      },
      env: { OPENAI_API_KEY: "cle-de-test" },
    });
    await assert.rejects(() => provider.draft(request), /pas autorisé/);
  });

  it("refuse une clé absente sans appeler le réseau", async () => {
    let called = false;
    const provider = new OpenAiNarrativeProvider({
      fetchImpl: async () => {
        called = true;
        throw new Error("réseau");
      },
      env: {},
    });
    await assert.rejects(
      () => provider.draft({ ...request, allowNetwork: true }),
      /OPENAI_API_KEY absent/,
    );
    assert.equal(called, false);
  });

  it("rejette un nombre inventé et conserve le repli", async () => {
    const provider = new OpenAiNarrativeProvider({
      env: { OPENAI_API_KEY: "cle-de-test" },
      fetchImpl: async () =>
        jsonResponse({
          observations: ["Le total inventé est de 999 tCO₂e."],
          interpretation: "Cette phrase ajoute un résultat qui n'appartient pas au dossier fourni.",
          recommandations: ["Revenir aux seuls chiffres autorisés."],
        }),
    });
    const draft = await provider.draft({ ...request, allowNetwork: true });
    assert.equal(draft.status, "rejected");
    assert.equal(draft.originalText, request.fallbackText);
    assert.equal(draft.model, "gpt-4.1-mini");
  });

  it("rejette une part du bilan présentée comme une part de scope", async () => {
    const provider = new OpenAiNarrativeProvider({
      env: { OPENAI_API_KEY: "cle-de-test" },
      fetchImpl: async () =>
        jsonResponse({
          observations: ["Le poste représente 30.3 % du total scope 3."],
          interpretation: "Cette attribution confond la part du bilan et la part interne du scope.",
          recommandations: ["Reformuler la part sur le bilan entier."],
        }),
    });
    const draft = await provider.draft({
      ...request,
      facts: { ...request.facts, share: "30.3" },
      allowNetwork: true,
    });
    assert.equal(draft.status, "rejected");
  });

  it("rejette une formulation vide", async () => {
    const provider = new OpenAiNarrativeProvider({
      env: { OPENAI_API_KEY: "cle-de-test" },
      fetchImpl: async () =>
        jsonResponse({
          observations: ["Le total retenu est 2702.107 tCO₂e."],
          interpretation: "Le commentaire s'appuie sur la méthode de la ligne et ne modifie pas le résultat calculé.",
          recommandations: ["Conserver le texte de repli."],
        }),
    });
    const draft = await provider.draft({ ...request, allowNetwork: true });
    assert.equal(draft.status, "rejected");
  });

  it("rejette un commentaire d'action qui recopie l'hypothèse", async () => {
    const provider = new OpenAiNarrativeProvider({
      env: { OPENAI_API_KEY: "cle-de-test" },
      fetchImpl: async () =>
        jsonResponse({
          observations: ["Le levier vise à remplacer le proxy monétaire des achats par des données physiques."],
          interpretation: "La fiche reste hors inventaire.",
          recommandations: ["Attendre une donnée fournisseur avant de conclure."],
        }),
    });
    const draft = await provider.draft({
      ...request,
      slot: "recommendation",
      slotKey: "action-test",
      brief: {
        ...request.brief,
        dossier: { objectifConnu: "Remplacer le proxy monétaire des achats par des données physiques de fournisseurs." },
      },
      allowNetwork: true,
    });
    assert.equal(draft.status, "rejected");
  });

  it("accepte un commentaire d'action qui nomme le poste sans recopier l'hypothèse", async () => {
    const provider = new OpenAiNarrativeProvider({
      env: { OPENAI_API_KEY: "cle-de-test" },
      fetchImpl: async () =>
        jsonResponse({
          observations: ["La fiche porte sur l'électricité de l'usine de Sfax."],
          interpretation: "Le scénario reste hors inventaire tant que la méthode comptable n'est pas réunie.",
          recommandations: ["Vérifier les critères de qualité avant toute intégration."],
        }),
    });
    const draft = await provider.draft({
      ...request,
      slot: "recommendation",
      slotKey: "action-elec",
      facts: {},
      brief: {
        ...request.brief,
        chiffresAutorises: [],
        dossier: {
          action: "Électricité de l'usine de Sfax",
          poste: "Électricité, usine",
          objectifConnu: "une production photovoltaïque couvre une part de l'électricité de l'usine de Sfax.",
        },
      },
      allowNetwork: true,
    });
    assert.equal(draft.status, "generated");
  });

  it("rejette une recommandation qui invente un équipement", async () => {
    const provider = new OpenAiNarrativeProvider({
      env: { OPENAI_API_KEY: "cle-de-test" },
      fetchImpl: async () =>
        jsonResponse({
          observations: ["Une chaudière plus efficace est proposée pour le gaz."],
          interpretation: "Cette piste suppose un équipement qui n'est pas décrit dans le dossier de ce poste.",
        }),
    });
    const fallback = "Aucun levier n'est enregistré pour le gaz.";
    const draft = await provider.draft({
      ...request,
      slot: "recommendation",
      slotKey: "reco-gas-sfax",
      facts: {},
      brief: {
        ...request.brief,
        chiffresAutorises: [],
        dossier: { poste: "Gaz naturel, usine", levier: "Aucun levier n'est enregistré.", objectifConnu: "Aucun levier enregistré." },
      },
      fallbackText: fallback,
      allowNetwork: true,
    });
    assert.equal(draft.status, "rejected");
    assert.equal(draft.originalText, fallback);
  });

  it("rejette un gain inventé et conserve le repli", async () => {
    const provider = new OpenAiNarrativeProvider({
      env: { OPENAI_API_KEY: "cle-de-test" },
      fetchImpl: async () =>
        jsonResponse({
          texte: "Le gain potentiel de ce poste est de 12.5 tCO₂e. Cette valeur ne figure pas dans le dossier.",
        }),
    });
    const fallback = "Le gain n'est pas calculable.";
    const draft = await provider.draft({
      ...request,
      slot: "recommendation",
      slotKey: "reco-gas-sfax",
      facts: { seul: "370.08" },
      brief: { ...request.brief, chiffresAutorises: ["370.08"], dossier: { emissionsTco2e: "370.08" } },
      fallbackText: fallback,
      allowNetwork: true,
    });
    assert.equal(draft.status, "rejected");
    assert.equal(draft.originalText, fallback);
  });

  it("bascule sur le repli déterministe si l'API échoue", async () => {
    const provider = new OpenAiNarrativeProvider({
      env: { OPENAI_API_KEY: "cle-de-test" },
      fetchImpl: async () => new Response("indisponible", { status: 503 }),
    });
    const { model, records } = await enrichReport(undefined, undefined, { allowNetwork: true, provider });
    assert.equal(records.length > 0, true);
    assert.equal(records.every((record) => record.status === "fallback"), true);
    assert.match(JSON.stringify(model), /Texte de repli, non rédigé par OpenAI/);
    assert.equal(JSON.stringify(records).includes("cle-de-test"), false);
  });

  it("rejette un scope 2 qui exclut la production de l'électricité achetée", async () => {
    const provider = new OpenAiNarrativeProvider({
      env: { OPENAI_API_KEY: "cle-de-test" },
      fetchImpl: async () =>
        jsonResponse({
          texte: "Cette donnée ne couvre pas les émissions indirectes liées à la production d'électricité hors site.",
        }),
    });
    const draft = await provider.draft({ ...request, allowNetwork: true });
    assert.equal(draft.status, "rejected");
  });

  it("accepte une prose libre sans structure imposée", async () => {
    const provider = new OpenAiNarrativeProvider({
      env: { OPENAI_API_KEY: "cle-de-test" },
      fetchImpl: async () =>
        jsonResponse({
          texte: "Le total retenu est 2702.107 tCO₂e. Cette lecture reste limitée aux chiffres du dossier, et la piste est d'examiner le poste dominant.",
        }),
    });
    const draft = await provider.draft({ ...request, allowNetwork: true });
    assert.equal(draft.status, "generated");
    assert.match(draft.originalText, /2702\.107/);
    assert.doesNotMatch(draft.originalText, /Observation\.|Lecture\.|Piste\./);
  });

  it("accepte un texte limité aux nombres autorisés et conserve la consommation", async () => {
    const provider = new OpenAiNarrativeProvider({
      env: { OPENAI_API_KEY: "cle-de-test" },
      fetchImpl: async () => jsonResponse(accepted, { prompt_tokens: 120, completion_tokens: 80, total_tokens: 200 }),
    });
    const draft = await provider.draft({ ...request, allowNetwork: true });
    assert.equal(draft.status, "generated");
    assert.match(draft.originalText, /2702\.107/);
    assert.doesNotMatch(draft.originalText, /Observation\.|Lecture\.|Piste\./);
    assert.equal(draft.usage?.totalTokens, 200);
  });

  it("formate les nombres générés en français sans arrondir", () => {
    assert.equal(frenchifyNumbers("Le total est 2702.107 tCO2e, soit 30.3%."), "Le total est 2\u00a0702,107 tCO₂e, soit 30,3\u00a0%.");
    assert.equal(frenchifyNumbers("Exercice 2025, horizon 2027 et 2028."), "Exercice 2025, horizon 2027 et 2028.");
  });

  it("prépare un dossier par passage sans recalculer les émissions", () => {
    const briefs = buildNarrativeBriefs(ateliersDuSahel, analyze(ateliersDuSahel, DEFAULT_ANALYSIS_OPTIONS));
    assert.equal(Object.keys(briefs).length, 12);
    assert.equal(briefs.executive.questions.length, 5);
    assert.equal(briefs["post-freight-up"].mustMention.includes("démonstration"), true);
    assert.equal(briefs["post-purchases"].mustMention.includes("monétaire"), true);
    assert.equal(JSON.stringify(briefs).includes("9999"), false);
  });

  it("bloque la publication tant que les passages ne sont pas validés", async () => {
    const { model, records } = await enrichReport();
    assertModelProse(model);
    assert.equal(records.every((record) => record.status === "fallback"), true);
    assert.equal(model.document.pdfDescription.includes("rédigés par OpenAI"), false);
    assert.throws(() => assertReadyToPublish(records), /Validation humaine/);
    assert.doesNotThrow(() => assertReadyToPublish(records.map((record) => ({ ...record, status: "edited" }))));
  });

  it("signale un rapport incomplet lorsqu'un passage reste en repli", async () => {
    const briefs = buildNarrativeBriefs(ateliersDuSahel, analyze(ateliersDuSahel, DEFAULT_ANALYSIS_OPTIONS));
    const total = String(briefs.executive.dossier.totalTco2e);
    let calls = 0;
    const provider = new OpenAiNarrativeProvider({
      env: { OPENAI_API_KEY: "cle-de-test" },
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) {
          return jsonResponse({
            observations: [`Le total inventorié est ${total} tCO₂e.`],
            interpretation: "Des facteurs de démonstration limitent la lecture des postes de transport de ce jeu fictif.",
            recommandations: ["Examiner d'abord les postes dont le facteur est de démonstration."],
          });
        }
        return jsonResponse({
          observations: ["Un total inventé de 999 tCO₂e."],
          interpretation: "Cette phrase n'appartient pas aux faits transmis pour ce passage.",
          recommandations: ["Ignorer ce chiffre."],
        });
      },
    });
    const { model, records } = await enrichReport(undefined, undefined, { allowNetwork: true, provider });
    assert.equal(records[0].status, "generated");
    assert.equal(records.filter((record) => record.status === "generated").length < records.length, true);
    assert.match(model.document.pdfDescription, /repli/);
    assert.match(model.document.coverFoot, /incomplète/);
    const prose = JSON.stringify(model);
    assert.match(prose, /Texte de repli, non rédigé par OpenAI/);
  });
});
