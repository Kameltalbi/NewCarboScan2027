import { PILOT_MODELS, type ParagraphModel } from "./catalog.js";

export interface LoadedLibrary {
  source: "base" | "catalogue-embarque";
  reason: string | null;
  models: ParagraphModel[];
}

/** Si la lecture échoue ou ne renvoie rien, le catalogue embarqué reste utilisable. */
export async function loadPilotModels(read: () => Promise<ParagraphModel[] | null>): Promise<LoadedLibrary> {
  try {
    const models = await read();
    if (!models || models.length === 0) {
      return { source: "catalogue-embarque", reason: "base indisponible ou sans modèle actif", models: PILOT_MODELS };
    }
    return { source: "base", reason: null, models };
  } catch {
    return { source: "catalogue-embarque", reason: "base indisponible", models: PILOT_MODELS };
  }
}
