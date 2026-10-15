import { PROMPT_VERSION, type NarrativeDraft, type NarrativeProvider, type NarrativeRequest } from "./contract.js";

/** Prose déjà produite par le modèle de vue. Aucun appel réseau. */
export class FallbackNarrativeProvider implements NarrativeProvider {
  async draft(request: NarrativeRequest): Promise<NarrativeDraft> {
    return {
      slot: request.slot,
      slotKey: request.slotKey,
      promptVersion: PROMPT_VERSION,
      provider: "fallback",
      status: "fallback",
      originalText: request.fallbackText,
      editedText: null,
      model: null,
      usage: null,
      failureReason: null,
    };
  }
}

export function createNarrativeProvider(): NarrativeProvider {
  return new FallbackNarrativeProvider();
}
