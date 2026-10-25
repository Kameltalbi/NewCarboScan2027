import jsPDF from "jspdf";

export interface TesterBilanCategory {
  name: string;
  value: number;
  scope: number;
}

export interface TesterBilanPdfInput {
  companyName: string;
  sector?: string;
  year?: string | number;
  totalKg: number;
  scope1Kg: number;
  scope2Kg: number;
  scope3Kg: number;
  categories: TesterBilanCategory[];
}

const NAVY: [number, number, number] = [7, 63, 53];
const GREEN: [number, number, number] = [0, 191, 114];
const SCOPE = {
  1: [0, 191, 114] as [number, number, number],
  2: [0, 189, 206] as [number, number, number],
  3: [255, 133, 27] as [number, number, number],
};
const INK: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [90, 107, 100];
const TRACK: [number, number, number] = [228, 235, 232];

const ADVICE: Record<string, string> = {
  "Gaz naturel": "Isolez les réseaux de chaleur et réglez les chaudières. Chaque mètre cube évité baisse le scope 1.",
  "Fioul": "Remplacez le fioul par une énergie moins carbonée là où le procédé le permet, en commençant par le site le plus consommateur.",
  "Charbon": "Le charbon pèse lourd au scope 1. Planifiez sa substitution et suivez la consommation four par four.",
  "Carburant véhicules": "Suivez les litres par véhicule. L'éco-conduite et le renouvellement des véhicules les plus consommateurs réduisent ce poste.",
  "Fluides frigorigènes": "Une fuite de quelques kilos suffit à peser dans le bilan. Faites contrôler les circuits et privilégiez un fluide à plus faible impact.",
  "Électricité": "Identifiez les usages qui tirent la consommation. Un contrat d'électricité renouvelable réduit le scope 2.",
  "Vapeur": "Traquez les pertes du réseau vapeur et la récupération des condensats avant d'acheter davantage.",
  "Froid industriel": "Vérifiez les consignes de température et l'entretien des groupes froid : ce sont souvent les premiers kilowattheures évitables.",
  "Chaleur": "Récupérez la chaleur fatale et baissez les consignes des locaux peu occupés.",
  "Achats biens et services": "Demandez à vos principaux fournisseurs leur propre bilan. Le scope 3 achats se réduit d'abord sur les plus gros montants.",
  "Matières premières": "Mesurez les pertes matière. Acheter moins, ou une matière moins carbonée, agit directement sur ce poste.",
  "Biomasse": "Vérifiez l'origine de la biomasse et ne la comptez pas deux fois avec un combustible fossile.",
  "Déplacements voiture": "Remplacez les trajets courts en voiture par le train ou la visioconférence.",
  "Déplacements train": "Le train reste le mode le plus sobre. Gardez-le comme solution par défaut face à l'avion.",
  "Déplacements avion": "Séparez les vols évitables des vols nécessaires. Un long-courrier pèse plus qu'une année de trajets locaux.",
  "Domicile-travail": "Le covoiturage et le transport en commun baissent ce poste sans changer les effectifs.",
  "Logistique": "Regroupez les expéditions et privilégiez le bateau ou le train dès que le délai le permet.",
  "Déchets": "Triez ce qui peut être recyclé. La mise en décharge est le traitement le plus émetteur de ce questionnaire.",
};

function tonnes(kg: number): string {
  const t = kg / 1000;
  return t.toLocaleString("fr-FR", {
    minimumFractionDigits: t < 10 ? 2 : 1,
    maximumFractionDigits: t < 10 ? 2 : 1,
  });
}

function share(part: number, total: number): string {
  if (total <= 0) return "0 %";
  return `${((part / total) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

function footer(doc: jsPDF, page: number, pages: number) {
  doc.setFillColor(...GREEN);
  doc.rect(0, 287, 210, 1.2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("Estimation indicative issue du questionnaire. Ce n'est pas un bilan certifié.", 14, 292);
  doc.text(`${page} / ${pages}`, 196, 292, { align: "right" });
}

export function buildTesterBilanPdf(input: TesterBilanPdfInput): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const total = input.totalKg;
  const company = input.companyName.trim() || "Votre organisation";
  const year = input.year ? String(input.year) : String(new Date().getFullYear());
  const posts = [...input.categories].filter((c) => c.value > 0).sort((a, b) => b.value - a.value).slice(0, 6);

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CarboScan", 14, 13);
  doc.setFontSize(16);
  doc.text("Bilan carbone estimatif", 14, 23);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(year, 196, 23, { align: "right" });

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(company, 14, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(input.sector || "Organisation", 14, 51);

  doc.setFillColor(247, 248, 246);
  doc.roundedRect(14, 58, 182, 36, 2, 2, "F");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text("Total", 22, 68);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(`${tonnes(total)} tCO2e`, 22, 80);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("par an", 22, 87);

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Répartition par scope", 14, 110);

  const scopes = [
    { label: "Scope 1 — émissions directes", kg: input.scope1Kg, color: SCOPE[1] },
    { label: "Scope 2 — énergie achetée", kg: input.scope2Kg, color: SCOPE[2] },
    { label: "Scope 3 — autres émissions indirectes", kg: input.scope3Kg, color: SCOPE[3] },
  ];
  scopes.forEach((scope, index) => {
    const y = 120 + index * 22;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(scope.label, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${tonnes(scope.kg)} tCO2e`, 196, y, { align: "right" });
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(share(scope.kg, total), 196, y + 6, { align: "right" });
    doc.setFillColor(...TRACK);
    doc.roundedRect(14, y + 8, 140, 4, 1, 1, "F");
    const width = total > 0 ? (scope.kg / total) * 140 : 0;
    if (width > 0) {
      doc.setFillColor(...scope.color);
      doc.roundedRect(14, y + 8, Math.max(width, 1.5), 4, 1, 1, "F");
    }
  });

  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const note = doc.splitTextToSize(
    "Chiffres calculés à partir des réponses du questionnaire CarboScan : activité × facteur d'émission.",
    182,
  );
  doc.text(note, 14, 196);
  footer(doc, 1, 2);

  doc.addPage();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Postes et recommandations", 14, 11);

  doc.setTextColor(...INK);
  doc.setFontSize(13);
  doc.text("Postes les plus importants", 14, 28);

  const top = posts.length > 0 ? posts : [];
  if (top.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text("Aucune quantité n'a permis de calculer un poste d'émission.", 14, 40);
  }
  top.forEach((post, index) => {
    const y = 38 + index * 16;
    const color = SCOPE[post.scope as 1 | 2 | 3] || GREEN;
    doc.setFillColor(...color);
    doc.circle(17, y - 1, 1.6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(post.name, 22, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${tonnes(post.value)} tCO2e`, 150, y);
    doc.setTextColor(...MUTED);
    doc.text(share(post.value, total), 196, y, { align: "right" });
    doc.setFillColor(...TRACK);
    doc.roundedRect(22, y + 3, 120, 3, 1, 1, "F");
    const width = total > 0 ? (post.value / total) * 120 : 0;
    if (width > 0) {
      doc.setFillColor(...color);
      doc.roundedRect(22, y + 3, Math.max(width, 1.5), 3, 1, 1, "F");
    }
  });

  const recY = 38 + Math.max(top.length, 1) * 16 + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text("Recommandations", 14, recY);

  const advice = top.slice(0, 4).map((post) => ({
    title: post.name,
    text: ADVICE[post.name] || "Ce poste compte dans le total. Précisez les quantités pour choisir une action.",
  }));
  if (advice.length === 0) {
    advice.push({
      title: "Prochaine étape",
      text: "Renseignez au moins une consommation réelle pour faire apparaître les postes et les actions associées.",
    });
  }
  advice.forEach((item, index) => {
    const y = recY + 8 + index * 22;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(`${index + 1}. ${item.title}`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(item.text, 182).slice(0, 2);
    doc.text(lines, 14, y + 5);
  });

  footer(doc, 2, 2);
  return doc;
}

export function downloadTesterBilanPdf(input: TesterBilanPdfInput) {
  const doc = buildTesterBilanPdf(input);
  const slug = (input.companyName || "organisation")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const year = input.year ? String(input.year) : String(new Date().getFullYear());
  doc.save(`CarboScan_Bilan_${slug || "organisation"}_${year}.pdf`);
}
