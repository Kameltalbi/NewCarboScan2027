/** Une seule lecture par facteur. L'ordre est fixe : jeu fictif, puis postérieur, puis non daté. */

export type FactorTimeStatus = "jeu_fictif" | "posterieur" | "non_date";

export function factorTimeStatus(source: string, version: string, exerciseYear: number): FactorTimeStatus {
  if (isDemonstrationFactor(source, version)) return "jeu_fictif";
  const match = version.match(/20\d{2}/);
  if (match && Number(match[0]) > exerciseYear) return "posterieur";
  return "non_date";
}

export function factorTimeLabel(status: FactorTimeStatus): "Jeu fictif" | "Postérieur" | "Non daté" {
  if (status === "jeu_fictif") return "Jeu fictif";
  if (status === "posterieur") return "Postérieur";
  return "Non daté";
}

/** Source « Démonstration », ou version commençant par « demonstration », sans tenir compte de la casse. */
export function isDemonstrationFactor(source: string, version: string): boolean {
  const sourceIsDemo = source.localeCompare("Démonstration", "fr", { sensitivity: "accent" }) === 0;
  const versionIsDemo = version.toLocaleLowerCase("fr").startsWith("demonstration");
  return sourceIsDemo || versionIsDemo;
}
