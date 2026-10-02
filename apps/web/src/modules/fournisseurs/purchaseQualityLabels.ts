/** Libellés UX simples pour l'indice qualité CarboScan A–E (interne). */
export type QualityGrade = "A" | "B" | "C" | "D" | "E";

export function qualityLabel(grade: string | null | undefined): string {
  switch (String(grade || "").toUpperCase()) {
    case "A":
      return "Très précise";
    case "B":
      return "Bonne";
    case "C":
      return "Moyenne";
    case "D":
      return "Estimation";
    case "E":
      return "Estimation";
    default:
      return "Estimation";
  }
}

export function qualityHint(grade: string | null | undefined): string {
  switch (String(grade || "").toUpperCase()) {
    case "A":
      return "Donnée fournisseur documentée et vérifiée.";
    case "B":
      return "Donnée fournisseur ou physique de bonne qualité.";
    case "C":
      return "Quantité physique avec un facteur moyen.";
    case "D":
    case "E":
      return "Calcul réalisé à partir du montant de vos achats.";
    default:
      return "Estimation à améliorer progressivement.";
  }
}
