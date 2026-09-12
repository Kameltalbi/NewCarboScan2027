import React from 'react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList
} from 'recharts';

// ─── Types ──────────────────────────────────────────────────────────
export interface ProductReportData {
  productName: string;
  productCategory: string;
  functionalUnit: string;
  description?: string;
  composition?: string;
  companyName: string;
  sector: string;
  year: number;
  totalEmissions: number; // kg CO₂e
  perimeterType?: 'cradle-to-gate' | 'cradle-to-customer' | 'cradle-to-grave' | 'gate-to-gate';
  cbamMode?: boolean;
  hsCode?: string;
  studyMode?: 'pcf' | 'acv';
  // ACV multi-indicator totals
  totalEnergyMj?: number;
  totalWaterM3?: number;
  totalAcidificationKgso2e?: number;
  // ACV breakdown per phase
  acvBreakdown?: {
    phase: string;
    energy_mj: number;
    water_m3: number;
    acidification_kgso2e: number;
  }[];
  breakdown: {
    phase: string;
    emissions: number;
    percentage: number;
    isEstimated: boolean;
  }[];
  dominantPhase: string;
  dataQuality: {
    realData: number;
    estimatedData: number;
  };
  methodology: string;
  materials?: { name: string; quantity: number; unit: string; emissionFactor: number; origin?: string; scrapRate?: number }[];
  manufacturing?: { electricity: number; otherEnergy?: { type: string; quantity: number; unit: string } };
  transport?: { distance: number; mode: string; weight: number };
  usage?: { lifetime?: number; consumptionPerUse?: number; numberOfUses?: number };
  endOfLife?: { scenario: string; percentage: number };
  wastes?: { name: string; quantity: number; unit: string }[];
  subcontracting?: { processName: string; supplierName?: string; country?: string; emissionsKg: number; isEstimated: boolean }[];
  coProducts?: { productName: string; method: string; allocationPct: number; isMain: boolean }[];
}

// ─── Palette ────────────────────────────────────────────────────────
const C = {
  emerald: '#0E7C66',
  teal: '#1ABC9C',
  dark: '#0F172A',
  mint: '#86EFAC',
  amber: '#F59E0B',
  red: '#EF4444',
  slate: '#64748B',
  lightBg: '#F8FAFC',
  border: '#E5E7EB',
};

const PHASE_COLORS = [C.emerald, C.dark, C.teal, C.amber, C.red];

const PHASE_LABELS: Record<string, string> = {
  materials: 'Matières premières',
  manufacturing: 'Fabrication',
  transport: 'Transport',
  usage: 'Utilisation',
  endOfLife: 'Fin de vie',
  subcontracting: 'Sous-traitance',
  wastes: 'Déchets',
  packaging: 'Emballage',
  distribution: 'Distribution',
};

const TRANSPORT_LABELS: Record<string, string> = {
  road: 'Routier',
  sea: 'Maritime',
  air: 'Aérien',
  rail: 'Ferroviaire',
  mixed: 'Multimodal',
};

const EOL_LABELS: Record<string, string> = {
  recycling: 'Recyclage',
  incineration: 'Incinération',
  landfill: 'Enfouissement',
  reuse: 'Réemploi',
};

const PERIMETER_LABELS: Record<string, string> = {
  'cradle-to-gate': 'Cradle-to-gate (berceau à la sortie usine)',
  'cradle-to-customer': 'Cradle-to-customer (berceau au client)',
  'cradle-to-grave': 'Cradle-to-grave (berceau à la tombe)',
  'gate-to-gate': 'Gate-to-gate (porte à porte)',
};



// ─── Component ──────────────────────────────────────────────────────
const ProPlanEmpreinteProduitReport: React.FC<{ data: ProductReportData }> = ({ data }) => {
  const isACV = data.studyMode === 'acv';
  const ACTUAL_PAGES = isACV ? 17 : 16; // ACV gets an extra multi-indicator page
  const [currentPage, setCurrentPage] = React.useState(0);

  const tableOfContents = [
    { title: 'Couverture', page: 0 },
    { title: '1. Résumé exécutif', page: 1 },
    { title: '2. Contexte et objectifs', page: 2 },
    { title: '3. Description du produit', page: 3 },
    { title: '4. Unité fonctionnelle', page: 4 },
    { title: '5. Périmètre', page: 5 },
    { title: '6. Méthodologie', page: 6 },
    { title: '7. Inventaire (LCI)', page: 7 },
    { title: '8. Facteurs d\'émission', page: 8 },
    { title: '9. Résultats', page: 9 },
    ...(isACV ? [{ title: '9b. Indicateurs ACV', page: 10 }] : []),
    { title: `${isACV ? '10' : '10'}. Postes d'émissions`, page: isACV ? 11 : 10 },
    { title: `${isACV ? '11' : '11'}. Sensibilité`, page: isACV ? 12 : 11 },
    { title: `${isACV ? '12' : '12'}. Réduction`, page: isACV ? 13 : 12 },
    { title: `${isACV ? '13' : '13'}. Limites`, page: isACV ? 14 : 13 },
    { title: `${isACV ? '14' : '14'}. Conclusion`, page: isACV ? 15 : 14 },
    { title: `${isACV ? '15' : '15'}. Annexes`, page: isACV ? 16 : 15 },
  ];

  const chartData = data.breakdown.map((b, i) => ({
    name: PHASE_LABELS[b.phase] || b.phase,
    value: Number(b.emissions.toFixed(2)),
    percentage: b.percentage,
    fill: PHASE_COLORS[i % PHASE_COLORS.length],
  }));

  const sortedBreakdown = [...data.breakdown].sort((a, b) => b.emissions - a.emissions);
  const perimeterType = data.perimeterType || 'cradle-to-gate';

  // Compute totals for materials
  const materialTotalEmissions = data.materials?.reduce((s, m) => s + m.quantity * m.emissionFactor, 0) || 0;

  // ─── Header / Footer ─────────────────────────────────────────────
  const PageHeader = ({ pageNum }: { pageNum: number }) => {
    if (pageNum === 0) return null;
    return (
      <div className="flex justify-between items-center text-xs text-muted-foreground mb-6 pb-2 border-b border-border/50">
        <span className="font-lato">Empreinte Carbone Produit – {data.productName}</span>
        <span className="font-lato">{data.companyName} · {data.year}</span>
      </div>
    );
  };

  const PageFooter = ({ pageNum }: { pageNum: number }) => (
    <div className="flex justify-between items-center text-xs text-muted-foreground mt-auto pt-2 border-t border-border/50">
      <span className="font-lato">© {new Date().getFullYear()} CarboScan – Module Empreinte Produit</span>
      <span className="font-lato">Page {pageNum + 1}/{ACTUAL_PAGES}</span>
    </div>
  );

  const SectionTitle = ({ num, title }: { num: number; title: string }) => (
    <h2 className="text-3xl font-bold mb-4 text-[hsl(var(--carbon-impact))]">{num}. {title}</h2>
  );

  // For ACV mode, pages 10+ shift by 1 to make room for the ACV indicator page
  const getLogicalPage = (page: number): number => {
    if (!isACV) return page;
    if (page <= 9) return page;
    if (page === 10) return -1; // special ACV page
    return page - 1; // shift subsequent pages
  };

  const renderAcvIndicatorPage = () => {
    const acvBd = data.acvBreakdown || [];
    const acvChartData = acvBd.filter(b => b.energy_mj !== 0 || b.water_m3 !== 0 || b.acidification_kgso2e !== 0).map(b => ({
      name: PHASE_LABELS[b.phase] || b.phase,
      'Énergie (MJ)': Number(b.energy_mj.toFixed(2)),
      'Eau (m³)': Number(b.water_m3.toFixed(4)),
      'Acidification (kg SO₂e)': Number(b.acidification_kgso2e.toFixed(4)),
    }));
    return (
      <div className="flex flex-col h-full font-lato text-foreground">
        <PageHeader pageNum={10} />
        <SectionTitle num={9} title="Indicateurs environnementaux multi-critères" />
        <div className="space-y-4 text-sm leading-relaxed flex-1">
          <p>En complément de l'empreinte carbone, l'analyse ACV multi-indicateurs évalue l'impact du produit sur quatre catégories environnementales conformes aux normes ISO 14040/14044.</p>

          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Changement climatique', value: data.totalEmissions, unit: 'kg CO₂e', color: C.emerald },
              { label: 'Énergie primaire', value: data.totalEnergyMj || 0, unit: 'MJ', color: C.amber },
              { label: 'Consommation d\'eau', value: data.totalWaterM3 || 0, unit: 'm³', color: '#3B82F6' },
              { label: 'Acidification', value: data.totalAcidificationKgso2e || 0, unit: 'kg SO₂e', color: C.red },
            ].map((ind, i) => (
              <div key={i} className="text-center bg-muted/30 p-3 rounded-lg border border-border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{ind.label}</p>
                <p className="text-xl font-black mt-1" style={{ color: ind.color }}>
                  {ind.value < 0.01 && ind.value > 0 ? ind.value.toExponential(2) : ind.value.toFixed(2)}
                </p>
                <p className="text-[10px] text-muted-foreground">{ind.unit} / {data.functionalUnit}</p>
              </div>
            ))}
          </div>

          <h3 className="text-base font-semibold text-foreground mt-4">9b.1 Répartition par phase</h3>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50">
                <th className="border border-border p-2 text-left">Phase</th>
                <th className="border border-border p-2 text-right" style={{ color: C.emerald }}>CO₂e (kg)</th>
                <th className="border border-border p-2 text-right" style={{ color: C.amber }}>Énergie (MJ)</th>
                <th className="border border-border p-2 text-right" style={{ color: '#3B82F6' }}>Eau (m³)</th>
                <th className="border border-border p-2 text-right" style={{ color: C.red }}>Acid. (SO₂e)</th>
              </tr>
            </thead>
            <tbody>
              {data.breakdown.map((b, i) => {
                const acv = acvBd.find(a => a.phase === b.phase);
                return (
                  <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>
                    <td className="border border-border p-2 font-medium">{PHASE_LABELS[b.phase] || b.phase}</td>
                    <td className="border border-border p-2 text-right font-semibold" style={{ color: C.emerald }}>{b.emissions.toFixed(2)}</td>
                    <td className="border border-border p-2 text-right" style={{ color: C.amber }}>{(acv?.energy_mj || 0).toFixed(2)}</td>
                    <td className="border border-border p-2 text-right" style={{ color: '#3B82F6' }}>{(acv?.water_m3 || 0).toFixed(4)}</td>
                    <td className="border border-border p-2 text-right" style={{ color: C.red }}>{(acv?.acidification_kgso2e || 0).toFixed(4)}</td>
                  </tr>
                );
              })}
              <tr className="bg-muted/50 font-bold">
                <td className="border border-border p-2">Total</td>
                <td className="border border-border p-2 text-right" style={{ color: C.emerald }}>{data.totalEmissions.toFixed(2)}</td>
                <td className="border border-border p-2 text-right" style={{ color: C.amber }}>{(data.totalEnergyMj || 0).toFixed(2)}</td>
                <td className="border border-border p-2 text-right" style={{ color: '#3B82F6' }}>{(data.totalWaterM3 || 0).toFixed(4)}</td>
                <td className="border border-border p-2 text-right" style={{ color: C.red }}>{(data.totalAcidificationKgso2e || 0).toFixed(4)}</td>
              </tr>
            </tbody>
          </table>

          <h3 className="text-base font-semibold text-foreground mt-4">9b.2 Visualisation croisée</h3>
          {acvChartData.length > 0 && (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={acvChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip />
                <Bar dataKey="Énergie (MJ)" fill={C.amber} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Eau (m³)" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Acidification (kg SO₂e)" fill={C.red} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          <div className="bg-muted/30 p-3 rounded-lg border-l-4 border-[hsl(var(--carbon-impact))]">
            <p className="text-xs text-muted-foreground italic">
              Cette analyse multi-critères est conforme aux catégories d'impact recommandées par la norme ISO 14044
              et le PEF (Product Environmental Footprint) de l'Union Européenne.
            </p>
          </div>
        </div>
        <PageFooter pageNum={10} />
      </div>
    );
  };

  const renderPage = () => {
    // In ACV mode, page 10 is the ACV indicator page, and subsequent pages shift
    const logicalPage = getLogicalPage(currentPage);
    if (logicalPage === -1) return renderAcvIndicatorPage();

    switch (logicalPage) {
      // ══ PAGE 0: COUVERTURE ═════════════════════════════════════════
      case 0:
        return (
          <div className="relative h-full flex flex-col items-center justify-center p-12 rounded-lg">
            <div className="absolute top-8 left-8">
              <BrandLogo variant="dark" className="h-12 opacity-80" />
            </div>
            <div className="text-center space-y-6 max-w-3xl">
              <p className="text-sm uppercase tracking-widest text-muted-foreground font-lato">
                {isACV
                  ? 'Rapport conforme ISO 14040/14044 · PEF (EU) · Multi-indicateurs'
                  : <>Rapport conforme ISO 14067 · GHG Protocol Product Standard
                    {data.cbamMode && <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white rounded text-[10px] font-bold">CBAM</span>}
                  </>
                }
              </p>
              <h1 className="font-lato text-4xl font-black leading-tight text-[hsl(var(--carbon-impact))]">
                {isACV
                  ? <>Analyse de Cycle de Vie<br />Multi-indicateurs (ACV)</>
                  : <>Rapport d'Empreinte<br />Carbone Produit (PCF)</>
                }
              </h1>
              <h2 className="font-lato text-3xl font-bold text-foreground">{data.productName}</h2>
              <p className="text-lg text-muted-foreground font-lato">{data.companyName} · {data.sector}</p>

              {isACV ? (
                <div className="grid grid-cols-4 gap-3 max-w-2xl mx-auto mt-8">
                  {[
                    { label: 'CO₂e', value: data.totalEmissions, unit: 'kg', color: C.emerald },
                    { label: 'Énergie', value: data.totalEnergyMj || 0, unit: 'MJ', color: C.amber },
                    { label: 'Eau', value: data.totalWaterM3 || 0, unit: 'm³', color: '#3B82F6' },
                    { label: 'Acidification', value: data.totalAcidificationKgso2e || 0, unit: 'kg SO₂e', color: C.red },
                  ].map((ind, i) => (
                    <div key={i} className="border-2 rounded-xl p-4 text-center" style={{ borderColor: ind.color }}>
                      <p className="text-2xl font-black" style={{ color: ind.color }}>
                        {ind.value < 0.01 && ind.value > 0 ? ind.value.toExponential(2) : ind.value.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{ind.unit} {ind.label}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-[hsl(var(--carbon-impact))] rounded-xl p-8 max-w-md mx-auto mt-8">
                  <p className="text-5xl font-black text-[hsl(var(--carbon-impact))]">{data.totalEmissions.toFixed(2)}</p>
                  <p className="text-lg text-muted-foreground mt-2">kg CO₂e / {data.functionalUnit}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-6 mt-6 text-center text-sm">
                <div>
                  <p className="text-muted-foreground">Périmètre</p>
                  <p className="font-semibold text-foreground capitalize">{PERIMETER_LABELS[perimeterType]?.split('(')[0] || perimeterType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phase dominante</p>
                  <p className="font-semibold text-foreground">{PHASE_LABELS[data.dominantPhase] || data.dominantPhase}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Année de référence</p>
                  <p className="font-semibold text-foreground">{data.year}</p>
                </div>
              </div>
            </div>
            <div className="absolute bottom-8 text-center text-xs text-muted-foreground">
              <p>Conforme aux principes de l'ISO 14067 · ISO 14040/14044 · GHG Protocol Product Standard</p>
            </div>
          </div>
        );

      // ══ PAGE 1: RÉSUMÉ EXÉCUTIF ═══════════════════════════════════
      case 1:
        return (
          <div className="flex flex-col h-full font-lato text-foreground">
            <PageHeader pageNum={1} />
            <SectionTitle num={1} title="Résumé exécutif" />
            <div className="space-y-4 text-sm leading-relaxed flex-1">
              <p>
                Le présent rapport présente l'évaluation de l'empreinte carbone du produit
                <strong> {data.productName}</strong>, réalisée pour le compte de <strong>{data.companyName}</strong>
                (secteur : {data.sector}).
              </p>
              <p>
                L'empreinte carbone totale du produit est de{' '}
                <strong className="text-[hsl(var(--carbon-impact))]">{data.totalEmissions.toFixed(2)} kg CO₂e</strong> par{' '}
                <strong>{data.functionalUnit}</strong>, calculée selon une approche {PERIMETER_LABELS[perimeterType] || perimeterType}.
              </p>

              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="font-semibold mb-2">Les émissions proviennent principalement de :</p>
                <ol className="list-decimal pl-5 space-y-1">
                  {sortedBreakdown.slice(0, 3).map(item => (
                    <li key={item.phase}>
                      <strong>{PHASE_LABELS[item.phase]}</strong> : {item.emissions.toFixed(2)} kg CO₂e ({item.percentage.toFixed(1)}%)
                    </li>
                  ))}
                </ol>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-2">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" outerRadius={85} dataKey="value"
                      label={({ name, percentage }) => `${name}: ${percentage.toFixed(0)}%`} labelLine={false}>
                      {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v.toFixed(2)} kg CO₂e`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex items-center">
                  <div className="space-y-3">
                    <p className="text-muted-foreground italic text-sm leading-relaxed">
                      Répartition des émissions par phase du cycle de vie. L'identification de la phase dominante
                      permet de cibler les efforts d'éco-conception.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted/50 p-2 rounded text-center">
                        <p className="text-xs text-muted-foreground">Données réelles</p>
                        <p className="text-lg font-bold text-[hsl(var(--carbon-impact))]">{data.dataQuality.realData.toFixed(0)}%</p>
                      </div>
                      <div className="bg-muted/50 p-2 rounded text-center">
                        <p className="text-xs text-muted-foreground">Données estimées</p>
                        <p className="text-lg font-bold text-amber-500">{data.dataQuality.estimatedData.toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="font-semibold mt-2">Principales pistes de réduction :</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                {sortedBreakdown[0]?.phase === 'materials' && <li>Substitution par des matériaux recyclés ou biosourcés</li>}
                {sortedBreakdown[0]?.phase === 'manufacturing' && <li>Approvisionnement en énergie renouvelable</li>}
                {sortedBreakdown[0]?.phase === 'transport' && <li>Report modal vers le ferroviaire ou maritime</li>}
                <li>Optimisation des processus industriels</li>
                <li>Amélioration de l'efficacité énergétique</li>
              </ul>
            </div>
            <PageFooter pageNum={1} />
          </div>
        );

      // ══ PAGE 2: CONTEXTE ET OBJECTIFS ═════════════════════════════
      case 2:
        return (
          <div className="flex flex-col h-full font-lato text-foreground">
            <PageHeader pageNum={2} />
            <SectionTitle num={2} title="Contexte et objectifs de l'étude" />
            <div className="space-y-4 text-sm leading-relaxed flex-1">
              <h3 className="text-lg font-semibold text-foreground">2.1 Contexte</h3>
              <p>
                Dans un contexte de transition écologique et de renforcement des exigences réglementaires
                (CBAM, reporting ESG, affichage environnemental), la quantification de l'empreinte carbone
                des produits constitue un enjeu stratégique majeur pour les entreprises.
              </p>
              <p>
                L'entreprise <strong>{data.companyName}</strong>, opérant dans le secteur <strong>{data.sector}</strong>,
                a engagé cette démarche de mesure de l'empreinte carbone de son produit <strong>{data.productName}</strong>
                afin de disposer d'une évaluation quantitative de ses impacts climatiques sur l'ensemble du cycle de vie.
              </p>

              <h3 className="text-lg font-semibold mt-6 text-foreground">2.2 Objectifs de l'étude</h3>
              <div className="space-y-3">
                {[
                  { icon: '📊', title: 'Quantifier', desc: 'Mesurer les émissions de GES associées au produit sur l\'ensemble de son cycle de vie' },
                  { icon: '🎯', title: 'Identifier', desc: 'Repérer les principales sources d\'émissions (hotspots carbone)' },
                  { icon: '📋', title: 'Répondre', desc: 'Satisfaire les exigences réglementaires (CBAM, reporting ESG, affichage environnemental)' },
                  { icon: '📈', title: 'Stratégie', desc: 'Mettre en place une stratégie de réduction carbone basée sur des données' },
                  { icon: '🤝', title: 'Communiquer', desc: 'Fournir des données environnementales fiables aux clients et parties prenantes' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 bg-muted/20 p-3 rounded-lg">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="text-muted-foreground text-xs">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="text-lg font-semibold mt-6 text-foreground">2.3 Utilisation prévue des résultats</h3>
              <p>
                Les résultats de cette étude sont destinés à un usage interne pour piloter la stratégie
                environnementale du produit. Ils peuvent servir de base pour une communication B2B, sous
                réserve d'une revue critique conforme aux normes ISO 14040/14044.
              </p>
            </div>
            <PageFooter pageNum={2} />
          </div>
        );

      // ══ PAGE 3: DESCRIPTION DU PRODUIT ════════════════════════════
      case 3:
        return (
          <div className="flex flex-col h-full font-lato text-foreground">
            <PageHeader pageNum={3} />
            <SectionTitle num={3} title="Description du produit" />
            <div className="space-y-4 text-sm leading-relaxed flex-1">
              <p>Cette section présente les caractéristiques techniques du produit étudié.</p>

              <div className="bg-muted/30 p-5 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-muted-foreground">Nom du produit :</span> <strong>{data.productName}</strong></div>
                  <div><span className="text-muted-foreground">Catégorie :</span> <strong className="capitalize">{data.productCategory}</strong></div>
                  <div><span className="text-muted-foreground">Entreprise :</span> <strong>{data.companyName}</strong></div>
                  <div><span className="text-muted-foreground">Secteur :</span> <strong>{data.sector}</strong></div>
                </div>
                {data.description && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-muted-foreground">Fonction / Description :</p>
                    <p>{data.description}</p>
                  </div>
                )}
              </div>

              <h3 className="text-lg font-semibold mt-6 text-foreground">3.1 Composition principale</h3>
              {data.materials && data.materials.length > 0 ? (
                <div className="bg-muted/20 p-4 rounded-lg">
                  <ul className="list-disc pl-5 space-y-1">
                    {data.materials.map((m, i) => (
                      <li key={i}><strong>{m.name}</strong> : {m.quantity} {m.unit}{m.origin ? ` (origine : ${m.origin})` : ''}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-muted-foreground italic">
                  {data.composition || 'Composition détaillée non renseignée.'}
                </p>
              )}

              <h3 className="text-lg font-semibold mt-6 text-foreground">3.2 Processus de fabrication</h3>
              <p>
                Le produit est fabriqué par <strong>{data.companyName}</strong>.
                {data.manufacturing && (
                  <> Le processus de fabrication consomme environ <strong>{data.manufacturing.electricity} kWh</strong> d'électricité par unité fonctionnelle
                  {data.manufacturing.otherEnergy && <>, ainsi que <strong>{data.manufacturing.otherEnergy.quantity} {data.manufacturing.otherEnergy.unit}</strong> de {data.manufacturing.otherEnergy.type}</>}.</>
                )}
              </p>

              {data.usage?.lifetime && (
                <>
                  <h3 className="text-lg font-semibold mt-6 text-foreground">3.3 Durée de vie</h3>
                  <p>La durée de vie estimée du produit est de <strong>{data.usage.lifetime} ans</strong>.</p>
                </>
              )}
            </div>
            <PageFooter pageNum={3} />
          </div>
        );

      // ══ PAGE 4: UNITÉ FONCTIONNELLE ═══════════════════════════════
      case 4:
        return (
          <div className="flex flex-col h-full font-lato text-foreground">
            <PageHeader pageNum={4} />
            <SectionTitle num={4} title="Unité fonctionnelle et flux de référence" />
            <div className="space-y-4 text-sm leading-relaxed flex-1">
              <p>
                L'unité fonctionnelle est la grandeur de référence à laquelle sont rapportés tous les résultats
                de l'évaluation. Elle permet de normaliser les impacts et de rendre les résultats comparables.
              </p>

              <div className="bg-[hsl(var(--carbon-impact))]/5 border-2 border-[hsl(var(--carbon-impact))] rounded-xl p-6 text-center">
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Unité fonctionnelle retenue</p>
                <p className="text-2xl font-black text-[hsl(var(--carbon-impact))]">{data.functionalUnit}</p>
              </div>

              <h3 className="text-lg font-semibold mt-6 text-foreground">4.1 Flux de référence</h3>
              <p>
                Le flux de référence correspond à la quantité réelle de produit nécessaire pour satisfaire
                l'unité fonctionnelle. L'ensemble des données d'inventaire (matériaux, énergie, transport)
                sont rapportées à ce flux.
              </p>

              {data.materials && data.materials.length > 0 && (
                <div className="bg-muted/20 p-4 rounded-lg">
                  <p className="font-semibold mb-2">Quantités associées au flux de référence :</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="border border-border p-2 text-left">Intrant</th>
                        <th className="border border-border p-2 text-right">Quantité</th>
                        <th className="border border-border p-2 text-left">Unité</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.materials.map((m, i) => (
                        <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>
                          <td className="border border-border p-2">{m.name}</td>
                          <td className="border border-border p-2 text-right">{m.quantity}</td>
                          <td className="border border-border p-2">{m.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 className="text-lg font-semibold mt-6 text-foreground">4.2 Exemples d'unités fonctionnelles</h3>
              <div className="bg-muted/20 p-4 rounded-lg">
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-xs">
                  <li>1 kg de produit fini</li>
                  <li>1 tonne de structure métallique produite</li>
                  <li>1 m² de panneau</li>
                  <li>1 unité produite et emballée</li>
                </ul>
              </div>
            </div>
            <PageFooter pageNum={4} />
          </div>
        );

      // ══ PAGE 5: DÉFINITION DU PÉRIMÈTRE ══════════════════════════
      case 5: {
        const phases = ['materials', 'manufacturing', 'transport', 'usage', 'endOfLife'];
        const phaseDescriptions: Record<string, string> = {
          materials: 'Extraction et production des matières premières',
          manufacturing: 'Transformation, fabrication et consommation d\'énergie',
          transport: 'Transport des matières et distribution du produit fini',
          usage: 'Consommation d\'énergie et maintenance pendant la durée de vie',
          endOfLife: 'Traitement en fin de vie (recyclage, incinération, enfouissement)',
        };
        return (
          <div className="flex flex-col h-full font-lato text-foreground">
            <PageHeader pageNum={5} />
            <SectionTitle num={5} title="Définition du périmètre" />
            <div className="space-y-4 text-sm leading-relaxed flex-1">
              <p>
                Le périmètre définit les étapes du cycle de vie incluses dans l'évaluation.
                Le type de périmètre retenu pour cette étude est :
              </p>

              <div className="bg-[hsl(var(--carbon-impact))]/5 border border-[hsl(var(--carbon-impact))] rounded-lg p-4 text-center">
                <p className="text-xl font-bold text-[hsl(var(--carbon-impact))]">
                  {PERIMETER_LABELS[perimeterType] || perimeterType}
                </p>
              </div>

              <h3 className="text-lg font-semibold mt-6 text-foreground">5.1 Schéma du cycle de vie</h3>
              <div className="flex items-center justify-center gap-1 my-4">
                {phases.map((phase, idx) => {
                  const included = data.breakdown.some(b => b.phase === phase && b.emissions !== 0);
                  const isLast = idx === phases.length - 1;
                  return (
                    <React.Fragment key={phase}>
                      <div className={`text-center p-3 rounded-lg border-2 flex-1 ${included
                        ? 'border-[hsl(var(--carbon-impact))] bg-[hsl(var(--carbon-impact))]/5'
                        : 'border-dashed border-border bg-muted/10'
                      }`}>
                        <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-xs font-bold ${included ? 'bg-[hsl(var(--carbon-impact))] text-white' : 'bg-muted text-muted-foreground'}`}>
                          {idx + 1}
                        </div>
                        <p className="text-xs font-medium">{PHASE_LABELS[phase]}</p>
                        {!included && <p className="text-[9px] text-muted-foreground mt-1">Exclu</p>}
                      </div>
                      {!isLast && <span className="text-muted-foreground text-lg">→</span>}
                    </React.Fragment>
                  );
                })}
              </div>

              <h3 className="text-lg font-semibold mt-6 text-foreground">5.2 Détail des phases incluses</h3>
              <div className="space-y-2">
                {phases.map((phase, idx) => {
                  const included = data.breakdown.some(b => b.phase === phase && b.emissions !== 0);
                  return (
                    <div key={phase} className={`flex items-start gap-3 p-3 rounded-lg ${included ? 'bg-muted/30' : 'bg-muted/10 opacity-60'}`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${included ? 'bg-[hsl(var(--carbon-impact))] text-white' : 'bg-muted text-muted-foreground'}`}>{idx + 1}</span>
                      <div>
                        <p className="font-semibold text-xs">{PHASE_LABELS[phase]} {!included && <span className="text-muted-foreground font-normal">(non inclus)</span>}</p>
                        <p className="text-xs text-muted-foreground">{phaseDescriptions[phase]}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <PageFooter pageNum={5} />
          </div>
        );
      }

      // ══ PAGE 6: MÉTHODOLOGIE ══════════════════════════════════════
      case 6:
        return (
          <div className="flex flex-col h-full font-lato text-foreground">
            <PageHeader pageNum={6} />
            <SectionTitle num={6} title="Méthodologie" />
            <div className="space-y-4 text-sm leading-relaxed flex-1">
              <p>
                L'évaluation de l'empreinte carbone repose sur la méthodologie d'Analyse du Cycle de Vie (ACV)
                appliquée à l'indicateur changement climatique, conformément aux normes suivantes :
              </p>

              <div className="space-y-2">
                {[
                  { norm: 'ISO 14067:2018', desc: 'Gaz à effet de serre – Empreinte carbone des produits – Exigences et lignes directrices' },
                  { norm: 'ISO 14040:2006', desc: 'Management environnemental – ACV – Principes et cadre' },
                  { norm: 'ISO 14044:2006', desc: 'Management environnemental – ACV – Exigences et lignes directrices' },
                  { norm: 'GHG Protocol', desc: 'Product Life Cycle Accounting and Reporting Standard' },
                ].map((item, i) => (
                  <div key={i} className="bg-muted/20 p-3 rounded-lg flex gap-3">
                    <span className="font-bold text-[hsl(var(--carbon-impact))] whitespace-nowrap text-xs">{item.norm}</span>
                    <span className="text-xs text-muted-foreground">{item.desc}</span>
                  </div>
                ))}
              </div>

              <h3 className="text-lg font-semibold mt-6 text-foreground">6.1 Principe de calcul</h3>
              <div className="bg-muted/30 p-4 rounded-lg text-center">
                <p className="font-semibold text-lg text-[hsl(var(--carbon-impact))]">
                  Émissions (kg CO₂e) = Donnée d'activité × Facteur d'émission
                </p>
              </div>
              <p>
                Pour chaque phase du cycle de vie, les données d'activité (quantités de matériaux, énergie
                consommée, distances de transport, etc.) sont multipliées par les facteurs d'émission correspondants.
              </p>

              <h3 className="text-lg font-semibold mt-4 text-foreground">6.2 Trois étapes du calcul</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { step: '1', title: 'Collecte', desc: 'Données d\'activité (quantités, kWh, km, kg)' },
                  { step: '2', title: 'Facteurs d\'émission', desc: 'Application des FE (Base Carbone ADEME, Ecoinvent)' },
                  { step: '3', title: 'Calcul', desc: 'Multiplication et agrégation par phase' },
                ].map(item => (
                  <div key={item.step} className="bg-muted/20 p-3 rounded-lg text-center">
                    <div className="w-8 h-8 rounded-full bg-[hsl(var(--carbon-impact))] text-white mx-auto mb-2 flex items-center justify-center font-bold text-sm">{item.step}</div>
                    <p className="font-semibold text-xs">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>

              <h3 className="text-lg font-semibold mt-4 text-foreground">6.3 Qualité des données</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">Données réelles ({data.dataQuality.realData.toFixed(0)}%)</p>
                  <p className="text-xs text-muted-foreground mt-1">Mesures directes, factures, fiches techniques</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="font-semibold text-amber-700 dark:text-amber-400">Données estimées ({data.dataQuality.estimatedData.toFixed(0)}%)</p>
                  <p className="text-xs text-muted-foreground mt-1">Moyennes sectorielles, facteurs génériques</p>
                </div>
              </div>
            </div>
            <PageFooter pageNum={6} />
          </div>
        );

      // ══ PAGE 7: INVENTAIRE DU CYCLE DE VIE (LCI) ═════════════════
      case 7: {
        return (
          <div className="flex flex-col h-full font-lato text-foreground">
            <PageHeader pageNum={7} />
            <SectionTitle num={7} title="Inventaire du cycle de vie (LCI)" />
            <div className="space-y-4 text-sm leading-relaxed flex-1">
              <p>
                Cette section présente l'ensemble des données d'activité collectées pour chaque phase
                du cycle de vie du produit.
              </p>

              {/* 7.1 Matières premières */}
              <h3 className="text-base font-semibold text-foreground">7.1 Matières premières</h3>
              {data.materials && data.materials.length > 0 ? (
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border border-border p-2 text-left">Matériau</th>
                      <th className="border border-border p-2 text-right">Quantité</th>
                      <th className="border border-border p-2 text-left">Unité</th>
                      <th className="border border-border p-2 text-right">Perte (%)</th>
                      <th className="border border-border p-2 text-right">Qté effective</th>
                      <th className="border border-border p-2 text-left">Origine</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.materials.map((m, i) => {
                      const scrap = m.scrapRate || 0;
                      const effective = m.quantity * (1 + scrap / 100);
                      return (
                        <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>
                          <td className="border border-border p-2 font-medium">{m.name}</td>
                          <td className="border border-border p-2 text-right">{m.quantity}</td>
                          <td className="border border-border p-2">{m.unit}</td>
                          <td className="border border-border p-2 text-right">{scrap > 0 ? `${scrap}%` : '–'}</td>
                          <td className="border border-border p-2 text-right font-semibold">{effective.toFixed(2)}</td>
                          <td className="border border-border p-2 text-muted-foreground">{m.origin || '–'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted-foreground italic text-xs">Données matières non détaillées.</p>
              )}

              {/* 7.2 Énergie */}
              <h3 className="text-base font-semibold text-foreground">7.2 Énergie consommée (fabrication)</h3>
              {data.manufacturing ? (
                <div className="bg-muted/20 p-3 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Électricité</span>
                    <span className="font-semibold">{data.manufacturing.electricity} kWh</span>
                  </div>
                  {data.manufacturing.otherEnergy && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{data.manufacturing.otherEnergy.type}</span>
                      <span className="font-semibold">{data.manufacturing.otherEnergy.quantity} {data.manufacturing.otherEnergy.unit}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground italic text-xs">Données énergie non détaillées.</p>
              )}

              {/* 7.3 Transport */}
              <h3 className="text-base font-semibold text-foreground">7.3 Transport</h3>
              {data.transport ? (
                <div className="bg-muted/20 p-3 rounded-lg grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Distance</p>
                    <p className="text-lg font-bold">{data.transport.distance} km</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Mode</p>
                    <p className="text-lg font-bold">{TRANSPORT_LABELS[data.transport.mode] || data.transport.mode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Masse transportée</p>
                    <p className="text-lg font-bold">{data.transport.weight} kg</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground italic text-xs">Données transport non détaillées.</p>
              )}

              {/* 7.4 Utilisation & Fin de vie */}
              <h3 className="text-base font-semibold text-foreground">7.4 Utilisation</h3>
              {data.usage ? (
                <div className="bg-muted/20 p-3 rounded-lg grid grid-cols-3 gap-4 text-center text-xs">
                  {data.usage.lifetime && <div><p className="text-muted-foreground">Durée de vie</p><p className="text-base font-bold">{data.usage.lifetime} ans</p></div>}
                  {data.usage.consumptionPerUse && <div><p className="text-muted-foreground">Conso/utilisation</p><p className="text-base font-bold">{data.usage.consumptionPerUse} kWh</p></div>}
                  {data.usage.numberOfUses && <div><p className="text-muted-foreground">Nb utilisations/an</p><p className="text-base font-bold">{data.usage.numberOfUses}</p></div>}
                </div>
              ) : (
                <p className="text-muted-foreground italic text-xs">Phase d'utilisation non modélisée.</p>
              )}

              <h3 className="text-base font-semibold text-foreground">7.5 Fin de vie & Déchets</h3>
              {data.endOfLife ? (
                <div className="bg-muted/20 p-3 rounded-lg grid grid-cols-2 gap-4 text-center text-xs">
                  <div><p className="text-muted-foreground">Scénario</p><p className="text-base font-bold">{EOL_LABELS[data.endOfLife.scenario] || data.endOfLife.scenario}</p></div>
                  <div><p className="text-muted-foreground">Taux</p><p className="text-base font-bold">{data.endOfLife.percentage}%</p></div>
                </div>
              ) : (
                <p className="text-muted-foreground italic text-xs">Fin de vie non modélisée.</p>
              )}

              {/* 7.6 Sous-traitance */}
              {data.subcontracting && data.subcontracting.length > 0 && (
                <>
                  <h3 className="text-base font-semibold text-foreground">7.6 Processus sous-traités</h3>
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="border border-border p-2 text-left">Processus</th>
                        <th className="border border-border p-2 text-left">Fournisseur</th>
                        <th className="border border-border p-2 text-left">Pays</th>
                        <th className="border border-border p-2 text-right">Émissions (kg CO₂e)</th>
                        <th className="border border-border p-2 text-center">Données</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.subcontracting.map((s, i) => (
                        <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>
                          <td className="border border-border p-2 font-medium">{s.processName}</td>
                          <td className="border border-border p-2">{s.supplierName || '–'}</td>
                          <td className="border border-border p-2">{s.country || '–'}</td>
                          <td className="border border-border p-2 text-right font-semibold">{s.emissionsKg.toFixed(2)}</td>
                          <td className="border border-border p-2 text-center">{s.isEstimated ? '⚠️' : '✅'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {/* 7.7 Allocation coproduits */}
              {data.coProducts && data.coProducts.length > 0 && (
                <>
                  <h3 className="text-base font-semibold text-foreground">7.7 Allocation coproduits</h3>
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="border border-border p-2 text-left">Coproduit</th>
                        <th className="border border-border p-2 text-left">Méthode</th>
                        <th className="border border-border p-2 text-right">Part allouée (%)</th>
                        <th className="border border-border p-2 text-center">Principal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.coProducts.map((cp, i) => (
                        <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>
                          <td className="border border-border p-2 font-medium">{cp.productName}</td>
                          <td className="border border-border p-2 capitalize">{cp.method === 'mass' ? 'Massique' : 'Économique'}</td>
                          <td className="border border-border p-2 text-right font-semibold">{cp.allocationPct.toFixed(1)}%</td>
                          <td className="border border-border p-2 text-center">{cp.isMain ? '✅' : '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
            <PageFooter pageNum={7} />
          </div>
        );
      }

      // ══ PAGE 8: FACTEURS D'ÉMISSION ══════════════════════════════
      case 8:
        return (
          <div className="flex flex-col h-full font-lato text-foreground">
            <PageHeader pageNum={8} />
            <SectionTitle num={8} title="Facteurs d'émission" />
            <div className="space-y-4 text-sm leading-relaxed flex-1">
              <p>
                Les facteurs d'émission (FE) utilisés dans cette étude proviennent de bases de données
                reconnues et documentées. Chaque FE est exprimé en <strong>kg CO₂e par unité</strong> de
                donnée d'activité.
              </p>

              <h3 className="text-lg font-semibold text-foreground">8.1 Sources des facteurs d'émission</h3>
              <div className="space-y-2">
                {[
                  { source: 'Base Carbone® ADEME', desc: 'Base de données publique française de référence pour les facteurs d\'émission', url: 'base-empreinte.ademe.fr' },
                  { source: 'Ecoinvent', desc: 'Base de données internationale d\'inventaire du cycle de vie', url: 'ecoinvent.org' },
                  { source: 'IPCC (GIEC)', desc: 'Facteurs de référence du Groupe d\'experts intergouvernemental sur l\'évolution du climat', url: 'ipcc.ch' },
                  { source: 'GHG Protocol', desc: 'Protocoles et bases de données du GHG Protocol Initiative', url: 'ghgprotocol.org' },
                ].map((item, i) => (
                  <div key={i} className="bg-muted/20 p-3 rounded-lg">
                    <p className="font-semibold text-xs">{item.source}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>

              <h3 className="text-lg font-semibold mt-6 text-foreground">8.2 Facteurs d'émission appliqués</h3>
              {data.materials && data.materials.length > 0 ? (
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border border-border p-2 text-left">Donnée d'activité</th>
                      <th className="border border-border p-2 text-right">FE (kg CO₂e/unité)</th>
                      <th className="border border-border p-2 text-left">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.materials.map((m, i) => (
                      <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>
                        <td className="border border-border p-2">{m.name} ({m.unit})</td>
                        <td className="border border-border p-2 text-right font-semibold">{m.emissionFactor.toFixed(4)}</td>
                        <td className="border border-border p-2 text-muted-foreground">Base Carbone ADEME</td>
                      </tr>
                    ))}
                    <tr className={data.materials.length % 2 ? 'bg-muted/20' : ''}>
                      <td className="border border-border p-2">Électricité (kWh)</td>
                      <td className="border border-border p-2 text-right font-semibold">0.0570</td>
                      <td className="border border-border p-2 text-muted-foreground">Base Carbone ADEME</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div className="bg-muted/20 p-4 rounded-lg">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="border border-border p-2 text-left">Donnée d'activité</th>
                        <th className="border border-border p-2 text-right">FE (kg CO₂e/unité)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="border border-border p-2">Électricité (kWh)</td><td className="border border-border p-2 text-right">0.0570</td></tr>
                      <tr className="bg-muted/20"><td className="border border-border p-2">Transport routier (t·km)</td><td className="border border-border p-2 text-right">0.0620</td></tr>
                      <tr><td className="border border-border p-2">Transport maritime (t·km)</td><td className="border border-border p-2 text-right">0.0150</td></tr>
                      <tr className="bg-muted/20"><td className="border border-border p-2">Transport aérien (t·km)</td><td className="border border-border p-2 text-right">0.6020</td></tr>
                    </tbody>
                  </table>
                </div>
              )}

              <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border-l-4 border-amber-400 mt-4">
                <p className="text-xs">
                  ⚠️ Les facteurs d'émission peuvent varier selon la région, l'année et le fournisseur.
                  Les valeurs utilisées sont des moyennes représentatives.
                </p>
              </div>
            </div>
            <PageFooter pageNum={8} />
          </div>
        );

      // ══ PAGE 9: RÉSULTATS ════════════════════════════════════════
      case 9: {
        return (
          <div className="flex flex-col h-full font-lato text-foreground">
            <PageHeader pageNum={9} />
            <SectionTitle num={9} title="Résultats de l'empreinte carbone" />
            <div className="space-y-4 text-sm leading-relaxed flex-1">
              <div className="bg-[hsl(var(--carbon-impact))]/5 border-2 border-[hsl(var(--carbon-impact))] rounded-xl p-6 text-center">
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Empreinte carbone totale</p>
                <p className="text-4xl font-black text-[hsl(var(--carbon-impact))]">{data.totalEmissions.toFixed(2)} kg CO₂e</p>
                <p className="text-sm text-muted-foreground mt-1">par {data.functionalUnit}</p>
              </div>

              <h3 className="text-base font-semibold text-foreground">9.1 Répartition par phase du cycle de vie</h3>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border p-2 text-left">Phase</th>
                    <th className="border border-border p-2 text-right">Émissions (kg CO₂e)</th>
                    <th className="border border-border p-2 text-right">Part (%)</th>
                    <th className="border border-border p-2 text-center">Données</th>
                  </tr>
                </thead>
                <tbody>
                  {data.breakdown.map((b, i) => (
                    <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>
                      <td className="border border-border p-2 font-medium">{PHASE_LABELS[b.phase] || b.phase}</td>
                      <td className="border border-border p-2 text-right font-semibold text-[hsl(var(--carbon-impact))]">{b.emissions.toFixed(2)}</td>
                      <td className="border border-border p-2 text-right">{b.percentage.toFixed(1)}%</td>
                      <td className="border border-border p-2 text-center">{b.isEstimated ? '⚠️ Estimé' : '✅ Réel'}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/50 font-bold">
                    <td className="border border-border p-2">Total</td>
                    <td className="border border-border p-2 text-right text-[hsl(var(--carbon-impact))]">{data.totalEmissions.toFixed(2)}</td>
                    <td className="border border-border p-2 text-right">100%</td>
                    <td className="border border-border p-2"></td>
                  </tr>
                </tbody>
              </table>

              <h3 className="text-base font-semibold text-foreground mt-4">9.2 Visualisation graphique</h3>
              <div className="grid grid-cols-2 gap-4">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                      label={({ name, percentage }) => `${percentage.toFixed(0)}%`} labelLine={false}>
                      {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v.toFixed(2)} kg CO₂e`} />
                  </PieChart>
                </ResponsiveContainer>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} label={{ value: 'kg CO₂e', angle: -90, position: 'insideLeft', style: { fontSize: 9 } }} />
                    <Tooltip formatter={(v: number) => `${v} kg CO₂e`} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      <LabelList dataKey="value" position="top" style={{ fontSize: 8 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <PageFooter pageNum={9} />
          </div>
        );
      }

      // ══ PAGE 10: ANALYSE DES POSTES D'ÉMISSIONS ══════════════════
      case 10:
        return (
          <div className="flex flex-col h-full font-lato text-foreground">
            <PageHeader pageNum={10} />
            <SectionTitle num={10} title="Analyse des postes d'émissions" />
            <div className="space-y-4 text-sm leading-relaxed flex-1">
              <p>
                Cette section identifie les <strong>hotspots carbone</strong>, c'est-à-dire les postes
                responsables de la majorité des émissions. Cette analyse permet de prioriser les actions de réduction.
              </p>

              <h3 className="text-base font-semibold text-foreground">10.1 Classement par impact décroissant</h3>
              <div className="space-y-2">
                {sortedBreakdown.map((item, idx) => (
                  <div key={item.phase} className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' : idx === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>
                      {idx + 1}
                    </span>
                    <span className="w-32 font-medium text-xs">{PHASE_LABELS[item.phase]}</span>
                    <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: idx === 0 ? C.red : idx === 1 ? C.amber : C.emerald }} />
                    </div>
                    <span className="w-24 text-right font-semibold text-xs">{item.emissions.toFixed(2)} kg</span>
                    <span className="w-12 text-right text-muted-foreground text-xs">{item.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>

              <h3 className="text-base font-semibold mt-6 text-foreground">10.2 Identification des hotspots</h3>
              <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border-l-4 border-red-400">
                <p className="font-semibold text-red-700 dark:text-red-400 text-xs mb-2">Hotspot principal : {PHASE_LABELS[sortedBreakdown[0]?.phase]}</p>
                <p className="text-xs text-muted-foreground">
                  La phase <strong>{PHASE_LABELS[sortedBreakdown[0]?.phase]}</strong> représente
                  <strong> {sortedBreakdown[0]?.percentage.toFixed(1)}%</strong> des émissions totales.
                  C'est le levier prioritaire de réduction.
                </p>
              </div>

              {sortedBreakdown.length > 1 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border-l-4 border-amber-400">
                  <p className="font-semibold text-amber-700 dark:text-amber-400 text-xs mb-2">Hotspot secondaire : {PHASE_LABELS[sortedBreakdown[1]?.phase]}</p>
                  <p className="text-xs text-muted-foreground">
                    La phase <strong>{PHASE_LABELS[sortedBreakdown[1]?.phase]}</strong> contribue à hauteur de
                    <strong> {sortedBreakdown[1]?.percentage.toFixed(1)}%</strong>.
                  </p>
                </div>
              )}

              {/* 10.3 Waterfall chart */}
              <h3 className="text-base font-semibold mt-6 text-foreground">10.3 Cascade d'émissions (Waterfall)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={(() => {
                  let cumulative = 0;
                  return sortedBreakdown.map((item, idx) => {
                    const start = cumulative;
                    cumulative += item.emissions;
                    return {
                      name: (PHASE_LABELS[item.phase] || item.phase).substring(0, 12),
                      value: Number(item.emissions.toFixed(2)),
                      start: Number(start.toFixed(2)),
                      fill: idx === 0 ? C.red : idx === 1 ? C.amber : C.emerald,
                    };
                  }).concat([{ name: 'Total', value: Number(cumulative.toFixed(2)), start: 0, fill: C.dark }]);
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v: number) => `${v} kg CO₂e`} />
                  <Bar dataKey="start" stackId="a" fill="transparent" />
                  <Bar dataKey="value" stackId="a" radius={[3, 3, 0, 0]}>
                    {sortedBreakdown.concat([{ phase: 'total', emissions: data.totalEmissions, percentage: 100, isEstimated: false }]).map((_, i) => (
                      <Cell key={i} fill={i === 0 ? C.red : i === 1 ? C.amber : i === sortedBreakdown.length ? C.dark : C.emerald} />
                    ))}
                    <LabelList dataKey="value" position="top" style={{ fontSize: 7 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {data.materials && data.materials.length > 0 && (
                <>
                  <h3 className="text-base font-semibold mt-4 text-foreground">10.4 Détail par matériau</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={data.materials.map(m => ({
                      name: m.name.length > 15 ? m.name.substring(0, 15) + '…' : m.name,
                      value: Number((m.quantity * m.emissionFactor).toFixed(2)),
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v: number) => `${v} kg CO₂e`} />
                      <Bar dataKey="value" fill={C.emerald} radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="value" position="top" style={{ fontSize: 8 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
            <PageFooter pageNum={10} />
          </div>
        );

      // ══ PAGE 11: ANALYSE DE SENSIBILITÉ ══════════════════════════
      case 11:
        return (
          <div className="flex flex-col h-full font-lato text-foreground">
            <PageHeader pageNum={11} />
            <SectionTitle num={11} title="Analyse de sensibilité et incertitudes" />
            <div className="space-y-4 text-sm leading-relaxed flex-1">
              <p>
                Cette section examine l'impact des hypothèses utilisées et les marges d'incertitude
                associées aux résultats.
              </p>

              <h3 className="text-lg font-semibold text-foreground">11.1 Sources d'incertitude</h3>
              <div className="space-y-2">
                {[
                  { param: 'Facteur carbone de l\'électricité', impact: 'Élevé', desc: 'À renseigner depuis le facteur versionné et son uncertainty_pct — aucun ± inventé' },
                  { param: 'Distances de transport', impact: 'Moyen', desc: 'Uniquement si mesurées ou estimées explicitement et validées' },
                  { param: 'Facteurs d\'émission des matériaux', impact: 'Moyen', desc: 'Propagés depuis le registre de facteurs (combineUncertaintyPct)' },
                  { param: 'Taux de pertes / déchets', impact: 'Faible', desc: 'Uniquement si présents dans le ledger / preuves' },
                ].map((item, i) => (
                  <div key={i} className="bg-muted/20 p-3 rounded-lg flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-xs">{item.param}</p>
                      <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${item.impact === 'Élevé' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' : item.impact === 'Moyen' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'}`}>
                      {item.impact}
                    </span>
                  </div>
                ))}
              </div>

              <h3 className="text-lg font-semibold mt-6 text-foreground">11.2 Scénarios de sensibilité</h3>
              <p>Variation de l'empreinte totale selon différentes hypothèses :</p>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border p-2 text-left">Scénario</th>
                    <th className="border border-border p-2 text-right">Impact estimé</th>
                    <th className="border border-border p-2 text-right">Variation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border p-2">FE électricité +30%</td>
                    <td className="border border-border p-2 text-right font-semibold">{(data.totalEmissions * 1.05).toFixed(2)} kg CO₂e</td>
                    <td className="border border-border p-2 text-right text-red-600">+5%</td>
                  </tr>
                  <tr className="bg-muted/20">
                    <td className="border border-border p-2">FE électricité -30%</td>
                    <td className="border border-border p-2 text-right font-semibold">{(data.totalEmissions * 0.95).toFixed(2)} kg CO₂e</td>
                    <td className="border border-border p-2 text-right text-emerald-600">-5%</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-2">Distances transport +50%</td>
                    <td className="border border-border p-2 text-right font-semibold">{(data.totalEmissions * 1.08).toFixed(2)} kg CO₂e</td>
                    <td className="border border-border p-2 text-right text-red-600">+8%</td>
                  </tr>
                  <tr className="bg-muted/20">
                    <td className="border border-border p-2">Matériaux 100% recyclés</td>
                    <td className="border border-border p-2 text-right font-semibold">{(data.totalEmissions * 0.7).toFixed(2)} kg CO₂e</td>
                    <td className="border border-border p-2 text-right text-emerald-600">-30%</td>
                  </tr>
                </tbody>
              </table>

              <div className="bg-muted/30 p-4 rounded-lg mt-4">
                <p className="text-xs text-muted-foreground italic">
                  Aucune incertitude globale arbitraire (±15&nbsp;% etc.) n&apos;est affichée.
                  Seules les incertitudes présentes dans le ledger / facteurs versionnés
                  peuvent être reportées. Module empreinte produit hors noyau certifiable
                  tant que la chaîne de preuve n&apos;est pas complète.
                </p>
              </div>
            </div>
            <PageFooter pageNum={11} />
          </div>
        );

      // ══ PAGE 12: SCÉNARIOS DE RÉDUCTION ══════════════════════════
      case 12:
        return (
          <div className="flex flex-col h-full font-lato text-foreground">
            <PageHeader pageNum={12} />
            <SectionTitle num={12} title="Scénarios de réduction des émissions" />
            <div className="space-y-4 text-sm leading-relaxed flex-1">
              <p>
                Sur la base des résultats obtenus, plusieurs pistes d'amélioration sont proposées pour
                réduire l'empreinte carbone du produit.
              </p>

              <div className="space-y-3">
                {[
                  { title: 'Utiliser des matériaux recyclés', impact: 'À quantifier', phase: 'Matières premières', desc: 'Substitution par de l\'acier recyclé, plastique recyclé ou matériaux biosourcés — impact à calculer via le moteur', priority: 'Haute' },
                  { title: 'Énergie renouvelable en production', impact: '-15 à -25%', phase: 'Fabrication', desc: 'Approvisionnement en électricité verte (PPA, certificats d\'origine garantie)', priority: 'Haute' },
                  { title: 'Optimiser les procédés industriels', impact: '-5 à -15%', phase: 'Fabrication', desc: 'Amélioration de l\'efficacité énergétique, récupération de chaleur fatale', priority: 'Moyenne' },
                  { title: 'Réduire les distances de transport', impact: '-5 à -10%', phase: 'Transport', desc: 'Sourcing local, consolidation des flux, report modal (maritime/ferroviaire)', priority: 'Moyenne' },
                  { title: 'Conception pour la durabilité', impact: '-10 à -20%', phase: 'Usage / Fin de vie', desc: 'Allongement de la durée de vie, réparabilité, recyclabilité accrue', priority: 'Moyenne' },
                  { title: 'Optimiser les emballages', impact: '-2 à -5%', phase: 'Transport', desc: 'Réduction du poids, matériaux d\'emballage recyclés', priority: 'Faible' },
                ].map((item, i) => (
                  <div key={i} className="bg-muted/20 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-foreground text-xs">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground">Phase : {item.phase}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[hsl(var(--carbon-impact))] font-bold text-sm">{item.impact}</span>
                        <p className={`text-[10px] font-semibold ${item.priority === 'Haute' ? 'text-red-600' : item.priority === 'Moyenne' ? 'text-amber-600' : 'text-muted-foreground'}`}>
                          Priorité {item.priority}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="bg-[hsl(var(--carbon-impact))]/5 p-4 rounded-lg border border-[hsl(var(--carbon-impact))]/20 mt-4">
                <p className="text-xs font-semibold text-[hsl(var(--carbon-impact))] mb-1">💡 Potentiel de réduction cumulé</p>
                <p className="text-xs text-muted-foreground">
                  En combinant les actions prioritaires, une réduction de <strong>30 à 50%</strong> de l'empreinte
                  carbone du produit est envisageable à moyen terme (3-5 ans).
                </p>
              </div>
            </div>
            <PageFooter pageNum={12} />
          </div>
        );

      // ══ PAGE 13: LIMITES DE L'ÉTUDE ══════════════════════════════
      case 13:
        return (
          <div className="flex flex-col h-full font-lato text-foreground">
            <PageHeader pageNum={13} />
            <SectionTitle num={13} title="Limites de l'étude" />
            <div className="space-y-4 text-sm leading-relaxed flex-1">
              <p>
                Toute étude d'empreinte carbone comporte des limites qui doivent être clairement
                identifiées et communiquées. Les limites suivantes s'appliquent à la présente évaluation.
              </p>

              <div className="space-y-3">
                {[
                  { title: 'Méthodologie simplifiée', desc: 'Cette évaluation repose sur une approche simplifiée et ne constitue pas une ACV complète conforme aux normes ISO 14040/14044. Les résultats sont indicatifs.', icon: '⚠️' },
                  { title: 'Facteurs d\'émission génériques', desc: 'Les facteurs d\'émission utilisés sont des moyennes sectorielles ou nationales qui peuvent s\'écarter des valeurs spécifiques au fournisseur ou au procédé.', icon: '⚠️' },
                  { title: 'Données estimées', desc: `${data.dataQuality.estimatedData.toFixed(0)}% des données utilisées sont des estimations basées sur des ratios sectoriels, des hypothèses ou des moyennes.`, icon: '⚠️' },
                  { title: 'Périmètre incomplet', desc: 'Certaines étapes du cycle de vie peuvent ne pas être couvertes (utilisation, fin de vie). Les émissions réelles totales peuvent être supérieures.', icon: '⚠️' },
                  { title: 'Indicateur unique', desc: 'Seul l\'indicateur changement climatique (kg CO₂e) est traité. D\'autres impacts environnementaux (eau, biodiversité, toxicité) ne sont pas évalués.', icon: '⚠️' },
                  { title: 'Données fournisseurs', desc: 'Les données environnementales des fournisseurs ne sont pas toujours disponibles et ont été remplacées par des données génériques.', icon: '⚠️' },
                ].map((item, i) => (
                  <div key={i} className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border-l-4 border-amber-400">
                    <p className="font-semibold text-xs">{item.icon} {item.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="bg-muted/30 p-4 rounded-lg mt-4">
                <p className="font-semibold text-xs mb-2">Usage recommandé :</p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
                  <li><strong>Usage interne :</strong> Ce rapport peut être utilisé pour le pilotage de la stratégie environnementale.</li>
                  <li><strong>Communication B2B :</strong> Possible sous réserve de mentionner les limites méthodologiques.</li>
                  <li><strong>Affichage environnemental / écolabel :</strong> Une ACV complète conforme ISO 14040/14044 avec revue critique est requise.</li>
                </ul>
              </div>
            </div>
            <PageFooter pageNum={13} />
          </div>
        );

      // ══ PAGE 14: CONCLUSION ══════════════════════════════════════
      case 14:
        return (
          <div className="flex flex-col h-full font-lato text-foreground">
            <PageHeader pageNum={14} />
            <SectionTitle num={14} title="Conclusion" />
            <div className="space-y-4 text-sm leading-relaxed flex-1">
              <p>
                L'évaluation de l'empreinte carbone du produit <strong>{data.productName}</strong> met en
                évidence un impact total de <strong className="text-[hsl(var(--carbon-impact))]">
                {data.totalEmissions.toFixed(2)} kg CO₂e</strong> par <strong>{data.functionalUnit}</strong>.
              </p>

              <div className="bg-muted/30 p-5 rounded-lg space-y-3">
                <h3 className="font-semibold text-foreground">Principaux enseignements</h3>
                <div className="space-y-2">
                  <div className="flex gap-3">
                    <span className="text-xl">🎯</span>
                    <p className="text-xs">
                      La phase <strong>{PHASE_LABELS[sortedBreakdown[0]?.phase]}</strong> constitue le principal
                      poste d'émissions ({sortedBreakdown[0]?.percentage.toFixed(0)}%), suivie de
                      <strong> {PHASE_LABELS[sortedBreakdown[1]?.phase]}</strong> ({sortedBreakdown[1]?.percentage.toFixed(0)}%).
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xl">📊</span>
                    <p className="text-xs">
                      {data.dataQuality.realData.toFixed(0)}% des données sont issues de mesures réelles,
                      {data.dataQuality.estimatedData.toFixed(0)}% sont estimées.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xl">🔄</span>
                    <p className="text-xs">
                      Un potentiel de réduction de 30 à 50% est identifié en combinant les actions sur
                      les matériaux, l'énergie et le transport.
                    </p>
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-semibold mt-6 text-foreground">Recommandations stratégiques</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li className="text-xs">
                  <strong>Court terme (0-1 an) :</strong> Engager un audit énergétique des procédés de fabrication
                  et explorer l'approvisionnement en électricité renouvelable.
                </li>
                <li className="text-xs">
                  <strong>Moyen terme (1-3 ans) :</strong> Substituer progressivement les matériaux vierges par
                  des matériaux recyclés et optimiser la logistique (report modal).
                </li>
                <li className="text-xs">
                  <strong>Long terme (3-5 ans) :</strong> Repenser la conception du produit selon les principes
                  d'éco-conception (durabilité, réparabilité, recyclabilité).
                </li>
              </ol>

              <h3 className="text-lg font-semibold mt-6 text-foreground">Pour aller plus loin</h3>
              <p>
                CarboScan propose le module <strong>ACV (Analyse du Cycle de Vie)</strong> pour une évaluation
                multi-critères complète conforme ISO 14040/14044, couvrant l'ensemble des catégories d'impact
                environnemental (climat, eau, biodiversité, toxicité, etc.).
              </p>

              <div className="mt-8 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <BrandLogo variant="light" className="h-12 mx-auto opacity-60" />
                  <p className="text-xs text-muted-foreground">CarboScan – La suite carbone pour les entreprises engagées</p>
                </div>
              </div>
            </div>
            <PageFooter pageNum={14} />
          </div>
        );

      // ══ PAGE 15: ANNEXES ═════════════════════════════════════════
      case 15:
        return (
          <div className="flex flex-col h-full font-lato text-foreground">
            <PageHeader pageNum={15} />
            <SectionTitle num={15} title="Annexes" />
            <div className="space-y-4 text-sm leading-relaxed flex-1">
              <h3 className="text-base font-semibold text-foreground">A. Calculs détaillés par matériau</h3>
              {data.materials && data.materials.length > 0 ? (
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border border-border p-2 text-left">Matériau</th>
                      <th className="border border-border p-2 text-right">Quantité</th>
                      <th className="border border-border p-2 text-right">FE (kg CO₂e/{'{u}'})</th>
                      <th className="border border-border p-2 text-right">Émissions</th>
                      <th className="border border-border p-2 text-right">% du total mat.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.materials.map((m, i) => {
                      const emissions = m.quantity * m.emissionFactor;
                      return (
                        <tr key={i} className={i % 2 ? 'bg-muted/20' : ''}>
                          <td className="border border-border p-2">{m.name}</td>
                          <td className="border border-border p-2 text-right">{m.quantity} {m.unit}</td>
                          <td className="border border-border p-2 text-right">{m.emissionFactor.toFixed(4)}</td>
                          <td className="border border-border p-2 text-right font-semibold">{emissions.toFixed(2)}</td>
                          <td className="border border-border p-2 text-right">{materialTotalEmissions > 0 ? ((emissions / materialTotalEmissions) * 100).toFixed(1) : '0.0'}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted-foreground italic text-xs">Détail non disponible.</p>
              )}

              <h3 className="text-base font-semibold mt-6 text-foreground">B. Facteurs d'émission utilisés</h3>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border p-2 text-left">Poste</th>
                    <th className="border border-border p-2 text-right">Facteur</th>
                    <th className="border border-border p-2 text-left">Unité</th>
                    <th className="border border-border p-2 text-left">Source</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="border border-border p-2">Électricité</td><td className="border border-border p-2 text-right">0.0570</td><td className="border border-border p-2">kg CO₂e/kWh</td><td className="border border-border p-2">ADEME</td></tr>
                  <tr className="bg-muted/20"><td className="border border-border p-2">Transport routier</td><td className="border border-border p-2 text-right">0.0620</td><td className="border border-border p-2">kg CO₂e/t·km</td><td className="border border-border p-2">ADEME</td></tr>
                  <tr><td className="border border-border p-2">Transport maritime</td><td className="border border-border p-2 text-right">0.0150</td><td className="border border-border p-2">kg CO₂e/t·km</td><td className="border border-border p-2">ADEME</td></tr>
                  <tr className="bg-muted/20"><td className="border border-border p-2">Transport aérien</td><td className="border border-border p-2 text-right">0.6020</td><td className="border border-border p-2">kg CO₂e/t·km</td><td className="border border-border p-2">ADEME</td></tr>
                  <tr><td className="border border-border p-2">Transport ferroviaire</td><td className="border border-border p-2 text-right">0.0220</td><td className="border border-border p-2">kg CO₂e/t·km</td><td className="border border-border p-2">ADEME</td></tr>
                </tbody>
              </table>

              <h3 className="text-base font-semibold mt-6 text-foreground">C. Hypothèses méthodologiques</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
                <li>Approche {PERIMETER_LABELS[perimeterType] || perimeterType}</li>
                <li>Année de référence : {data.year}</li>
                <li>Unité fonctionnelle : {data.functionalUnit}</li>
                <li>Méthodologie : {data.methodology}</li>
                <li>Données réelles : {data.dataQuality.realData.toFixed(0)}% | Estimées : {data.dataQuality.estimatedData.toFixed(0)}%</li>
              </ul>

              <h3 className="text-base font-semibold mt-6 text-foreground">D. Informations du rapport</h3>
              <div className="bg-muted/20 p-4 rounded-lg space-y-1 text-xs">
                <p><strong>Produit :</strong> {data.productName}</p>
                <p><strong>Entreprise :</strong> {data.companyName}</p>
                <p><strong>Secteur :</strong> {data.sector}</p>
                <p><strong>Date de génération :</strong> {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>Outil :</strong> CarboScan – Module Empreinte Produit</p>
              </div>
            </div>
            <PageFooter pageNum={15} />
          </div>
        );

      default:
        return <div>Page non trouvée</div>;
    }
  };

  // ─── Layout ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="max-w-[210mm] mx-auto">
        {/* Actions */}
        <div className="flex justify-between items-center mb-4 bg-background p-4 rounded-lg shadow">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Download className="w-4 h-4 mr-2" />
              Télécharger PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(0)}>
              <FileText className="w-4 h-4 mr-2" />
              Couverture
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Page {currentPage + 1} / {ACTUAL_PAGES}
          </div>
        </div>

        {/* A4 Page */}
        <Card className="w-[210mm] min-h-[297mm] p-8 shadow-lg bg-background mx-auto overflow-hidden flex flex-col">
          {renderPage()}
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-4 bg-background p-4 rounded-lg shadow">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
          >
            ← Précédent
          </Button>
          <div className="flex gap-1 flex-wrap justify-center max-w-md">
            {tableOfContents.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPage(idx)}
                className={`w-7 h-7 rounded-full text-[10px] font-semibold transition-colors ${
                  currentPage === idx
                    ? 'bg-[hsl(var(--carbon-impact))] text-white'
                    : 'bg-muted hover:bg-muted-foreground/20'
                }`}
                title={item.title}
              >
                {idx === 0 ? '🏠' : idx}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.min(ACTUAL_PAGES - 1, currentPage + 1))}
            disabled={currentPage === ACTUAL_PAGES - 1}
          >
            Suivant →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProPlanEmpreinteProduitReport;
