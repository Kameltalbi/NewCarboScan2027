import { useEffect, useState } from "react";
import { listDiagnostics, readOwnedDiagnostic } from "@/features/diagnostic360/api";
import { downloadDiagnosticPdf } from "@/features/diagnostic360/diagnosticPdf";
import { RESULT_AXIS_LABELS } from "@/features/diagnostic360/flow";
import { trackDiagnostic } from "@/features/diagnostic360/analytics";
import type { OrgDiagnosticSummary, PublicSnapshot } from "@/features/diagnostic360/types";

const RELIABILITY = { high: "Élevée", medium: "Moyenne", low: "Limitée" } as const;

export function MesDiagnostics() {
  const [items, setItems] = useState<OrgDiagnosticSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ completedAt: string | null; snapshot: PublicSnapshot } | null>(null);

  useEffect(() => {
    let cancelled = false;
    listDiagnostics()
      .then((body) => {
        if (!cancelled) setItems(body.diagnostics);
      })
      .catch(() => {
        if (!cancelled) setError("Impossible de charger vos diagnostics.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function openItem(item: OrgDiagnosticSummary) {
    setError(null);
    const detail = await readOwnedDiagnostic(item.sessionId);
    if (!detail.result) {
      setError("Ce diagnostic n'a pas encore de résultat figé.");
      return;
    }
    setSelected({ completedAt: detail.completedAt, snapshot: detail.result });
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-[#073D30]">Mes diagnostics</h1>
      <p className="mt-2 max-w-2xl text-sm text-[#52615C]">
        Chaque diagnostic reste attaché à la version méthodologique utilisée. Un nouveau diagnostic ne recalcule pas les précédents.
      </p>
      {error && <p role="alert" className="mt-4 text-sm text-[#8A3B2C]">{error}</p>}
      {items === null && !error && <p className="mt-6 text-sm text-[#52615C]">Chargement…</p>}
      {items?.length === 0 && <p className="mt-6 text-sm text-[#52615C]">Aucun diagnostic rattaché à cette organisation.</p>}
      {items && items.length > 0 && (
        <ul className="mt-6 divide-y divide-[#E4EBE7] rounded-2xl border border-[#E4EBE7] bg-white">
          {items.map((item) => (
            <li key={item.sessionId}>
              <button type="button" className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 text-left hover:bg-[#F7F8F6]" onClick={() => void openItem(item)}>
                <span className="min-w-32 text-sm text-[#073D30]">{formatDay(item.completedAt ?? item.startedAt)}</span>
                <span className="text-sm font-semibold text-[#073D30]">{item.maturityScore ?? "—"} / 100</span>
                <span className="text-sm text-[#52615C]">{item.displayLevelFr ?? item.maturityLevel ?? "—"}</span>
                <span className="text-sm text-[#52615C]">Données {item.dataReadinessScore ?? "—"} / 100</span>
                <span className="text-sm text-[#52615C]">Fiabilité {item.reliability ? RELIABILITY[item.reliability] : "—"}</span>
                <span className="text-xs text-[#8A9691]">{item.templateVersion}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && <FrozenResult detail={selected} />}
    </section>
  );
}

function FrozenResult({ detail }: { detail: { completedAt: string | null; snapshot: PublicSnapshot } }) {
  const snapshot = detail.snapshot;
  const limited = snapshot.reliabilityLimited;
  return (
    <article className="mt-8 rounded-2xl border border-[#E4EBE7] bg-white p-6">
      <p className="text-xs uppercase tracking-[0.14em] text-[#087354]">{snapshot.templateVersion}</p>
      <h2 className="mt-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#52615C]">
        {limited ? snapshot.presentation.scoreQualifierFr : "Maturité"}
      </h2>
      <p className="mt-2 text-5xl text-[#073D30]">{snapshot.maturityScore ?? "—"}<span className="text-xl"> / 100</span></p>
      <p className="mt-2 text-lg text-[#073D30]">{snapshot.presentation.displayLevelFr}</p>
      {limited && snapshot.presentation.reliabilityWarningFr && (
        <p role="alert" className="mt-4 rounded-2xl border border-[#E7D7A8] bg-[#FBF6EA] p-4 text-sm text-[#073D30]">
          {snapshot.presentation.reliabilityWarningFr}
        </p>
      )}
      <p className="mt-6 text-sm text-[#52615C]">Disponibilité des données : {snapshot.dataReadinessScore ?? "—"} / 100</p>
      <ul className="mt-4 space-y-2">
        {snapshot.axisScores.map((axis) => (
          <li key={axis.axisId} className="flex justify-between text-sm text-[#073D30]">
            <span>{RESULT_AXIS_LABELS[axis.axisId]?.fr ?? axis.axisId}</span>
            <span>{axis.maturity == null ? "—" : axis.maturity}</span>
          </li>
        ))}
      </ul>
      <ol className="mt-6 space-y-3">
        {snapshot.recommendations.slice(0, 3).map((item) => (
          <li key={item.id}>
            <h3 className="font-semibold text-[#073D30]">{item.titleFr}</h3>
            <p className="text-sm text-[#52615C]">{item.bodyFr}</p>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="mt-6 inline-flex h-12 items-center rounded-[4px] bg-[#075C43] px-6 text-sm font-semibold text-white"
        onClick={() => {
          void downloadDiagnosticPdf({ snapshot, completedAt: detail.completedAt });
          trackDiagnostic("diagnostic_report_downloaded", { template_version: snapshot.templateVersion });
        }}
      >
        Télécharger le PDF
      </button>
    </article>
  );
}

function formatDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR");
}
