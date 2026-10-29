export interface BilanYearTotal {
  year: number;
  value: number;
}

/** Bilans déjà enregistrés pour une année antérieure à l'exercice affiché. */
export function pastBilanYears(
  rows: BilanYearTotal[],
  activeYear: number,
): BilanYearTotal[] {
  return rows
    .filter((row) => row.year < activeYear && row.value > 0)
    .sort((a, b) => b.year - a.year);
}
