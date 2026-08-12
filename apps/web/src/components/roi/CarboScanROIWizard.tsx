import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import {
  ScanLine,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Zap,
  TrendingUp,
  Landmark,
  ShieldAlert,
} from 'lucide-react';

const STEPS = [
  { id: 'intro', label: 'Introduction' },
  { id: 'efficacite', label: 'Efficacité' },
  { id: 'croissance', label: 'Croissance Business' },
  { id: 'capital', label: 'Accès au Capital' },
  { id: 'resultats', label: 'Résultats' },
] as const;

const SECTORS = [
  { id: 'industrie', label: 'Industrie / Manufacture', riskFactor: 1.6 },
  { id: 'energie', label: 'Énergie', riskFactor: 2.0 },
  { id: 'construction', label: 'Construction / BTP', riskFactor: 1.4 },
  { id: 'transport', label: 'Transport / Logistique', riskFactor: 1.5 },
  { id: 'retail', label: 'Retail / Distribution', riskFactor: 0.9 },
  { id: 'tech', label: 'Tech / Services', riskFactor: 0.5 },
] as const;

const COMPANY_TYPES = [
  { id: 'pme', label: 'PME (< 50M€ CA)' },
  { id: 'eti', label: 'ETI (50M€ – 1,5Md€ CA)' },
  { id: 'grand', label: 'Grand groupe (> 1,5Md€ CA)' },
] as const;

const CURRENCIES = [
  { code: 'EUR', symbol: '€', locale: 'fr-FR', region: 'Europe / International' },
  { code: 'USD', symbol: '$', locale: 'en-US', region: 'Europe / International' },
  { code: 'GBP', symbol: '£', locale: 'en-GB', region: 'Europe / International' },
  { code: 'CHF', symbol: 'CHF', locale: 'de-CH', region: 'Europe / International' },
  { code: 'TND', symbol: 'DT', locale: 'fr-TN', region: 'Afrique' },
  { code: 'MAD', symbol: 'DH', locale: 'fr-MA', region: 'Afrique' },
  { code: 'DZD', symbol: 'DA', locale: 'fr-DZ', region: 'Afrique' },
  { code: 'EGP', symbol: 'E£', locale: 'ar-EG', region: 'Afrique' },
  { code: 'XOF', symbol: 'CFA', locale: 'fr-SN', region: 'Afrique' },
  { code: 'XAF', symbol: 'FCFA', locale: 'fr-CM', region: 'Afrique' },
  { code: 'NGN', symbol: '₦', locale: 'en-NG', region: 'Afrique' },
  { code: 'GHS', symbol: 'GH₵', locale: 'en-GH', region: 'Afrique' },
  { code: 'KES', symbol: 'KSh', locale: 'en-KE', region: 'Afrique' },
  { code: 'ZAR', symbol: 'R', locale: 'en-ZA', region: 'Afrique' },
] as const;

type CurrencyCode = (typeof CURRENCIES)[number]['code'];

export const CarboScanROIWizard: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>('TND');
  const currencyObj = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[4];

  const [revenue, setRevenue] = useState(20);
  const [sector, setSector] = useState<(typeof SECTORS)[number]['id']>('industrie');
  const [companyType, setCompanyType] = useState<(typeof COMPANY_TYPES)[number]['id']>('pme');
  const [subscription, setSubscription] = useState(9000);

  const [hoursPerMonth, setHoursPerMonth] = useState(40);
  const [hourlyCost, setHourlyCost] = useState(65);
  const [peopleInvolved, setPeopleInvolved] = useState(2);

  const [rfpSharePct, setRfpSharePct] = useState(30);
  const [avgContractValue, setAvgContractValue] = useState(300000);
  const [lostDealBefore, setLostDealBefore] = useState(false);

  const [seekingFinancing, setSeekingFinancing] = useState(true);
  const [financingAmount, setFinancingAmount] = useState(2000000);
  const [rateReductionBps, setRateReductionBps] = useState(25);

  const sectorObj = SECTORS.find((s) => s.id === sector);

  const results = useMemo(() => {
    const efficacite = hoursPerMonth * hourlyCost * peopleInvolved * 12 * 0.65;
    const croissance =
      (rfpSharePct / 100) * avgContractValue * (lostDealBefore ? 0.35 : 0.2);
    const capital = seekingFinancing
      ? financingAmount * (rateReductionBps / 10000)
      : 0;
    const risques = revenue * 1_000_000 * (sectorObj?.riskFactor ?? 1) * 0.0015;
    const totalGains = efficacite + croissance + capital + risques;
    const netGain = totalGains - subscription;
    const roiPercent = subscription > 0 ? (netGain / subscription) * 100 : 0;
    const paybackMonths = totalGains > 0 ? subscription / (totalGains / 12) : Infinity;

    return { efficacite, croissance, capital, risques, totalGains, roiPercent, paybackMonths };
  }, [
    hoursPerMonth,
    hourlyCost,
    peopleInvolved,
    rfpSharePct,
    avgContractValue,
    lostDealBefore,
    seekingFinancing,
    financingAmount,
    rateReductionBps,
    revenue,
    sectorObj,
    subscription,
  ]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n));
  const fmtMoney = (n: number) =>
    new Intl.NumberFormat(currencyObj.locale, {
      style: 'currency',
      currency: currencyObj.code,
      maximumFractionDigits: 0,
    }).format(Math.round(n));

  const breakdown = [
    { name: 'Efficacité', value: Math.round(results.efficacite), color: '#4FD88C' },
    { name: 'Croissance business', value: Math.round(results.croissance), color: '#5FB8E8' },
    { name: 'Accès au capital', value: Math.round(results.capital), color: '#F2A93B' },
    { name: 'Risques évités', value: Math.round(results.risques), color: '#C97BE0' },
  ];

  const canGoNext = stepIndex < STEPS.length - 1;
  const canGoPrev = stepIndex > 0;

  return (
    <div className="min-h-screen w-full bg-[#0B0F0E] text-[#EAEAE2]">
      <style>{`
        .roi-wizard input[type="range"] { -webkit-appearance: none; height: 4px; background: #2A3330; border-radius: 2px; outline: none; }
        .roi-wizard input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 3px; background: #4FD88C; border: 2px solid #0B0F0E; box-shadow: 0 0 0 1px #4FD88C; cursor: pointer; }
        .roi-wizard input[type="range"]::-moz-range-thumb { width: 16px; height: 16px; border-radius: 3px; background: #4FD88C; border: 2px solid #0B0F0E; cursor: pointer; }
        .roi-wizard input[type="text"], .roi-wizard input[type="number"], .roi-wizard select {
          background: #121715; border: 1px solid #2A3330; color: #EAEAE2; border-radius: 6px; padding: 10px 12px; width: 100%;
        }
        .roi-wizard input[type="text"]:focus, .roi-wizard input[type="number"]:focus, .roi-wizard select:focus { outline: none; border-color: #4FD88C; }
        .roi-wizard .mono { font-family: 'SF Mono', 'JetBrains Mono', Consolas, monospace; }
        @keyframes roi-scanmove { 0% { transform: translateY(-100%); opacity:0;} 10%{opacity:1;} 90%{opacity:1;} 100%{transform: translateY(1400%); opacity:0;} }
        .roi-wizard .scan-line { position:absolute; left:0; right:0; height:2px; background: linear-gradient(90deg, transparent, #4FD88C 20%, #4FD88C 80%, transparent); box-shadow: 0 0 12px 2px rgba(79,216,140,0.6); animation: roi-scanmove 3.2s linear infinite; }
      `}</style>

      <div className="roi-wizard">
        <div className="border-b border-[#2A3330] px-6 md:px-10 py-5 flex items-center gap-2">
          <ScanLine size={18} className="text-[#4FD88C]" strokeWidth={2.5} />
          <span className="mono text-xs tracking-[0.2em] uppercase text-[#8A9490]">
            CarboScan / Calculateur ROI plateforme
          </span>
        </div>

        <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="space-y-1">
              {STEPS.map((s, i) => {
                const state = i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'todo';
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => i <= stepIndex && setStepIndex(i)}
                    className={`w-full text-left px-3 py-3 rounded-md flex items-center gap-3 transition-colors ${
                      state === 'active' ? 'bg-[#121715] border border-[#2A3330]' : 'border border-transparent'
                    } ${i > stepIndex ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                        state === 'done'
                          ? 'bg-[#4FD88C] text-[#0B0F0E]'
                          : state === 'active'
                            ? 'border border-[#4FD88C] text-[#4FD88C]'
                            : 'border border-[#2A3330] text-[#5A6460]'
                      }`}
                    >
                      {state === 'done' ? <CheckCircle2 size={14} /> : i + 1}
                    </span>
                    <span className={`text-sm ${state === 'todo' ? 'text-[#5A6460]' : 'text-[#EAEAE2]'}`}>
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 h-1 bg-[#2A3330] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#4FD88C] transition-all duration-300"
                style={{ width: `${(stepIndex / (STEPS.length - 1)) * 100}%` }}
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="mono text-[10px] tracking-[0.2em] uppercase text-[#8A9490] mb-2">
              Étape {stepIndex + 1} sur {STEPS.length}
            </div>

            {stepIndex === 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-3">Informations générales</h2>
                <p className="text-[#8A9490] mb-8 max-w-xl">
                  Le BCG/WEF estime que chaque euro investi dans la transition climatique peut en générer
                  jusqu&apos;à 5. Décomposons ce chiffre pour votre entreprise.
                </p>

                <div className="space-y-5 max-w-lg">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <LabeledInput label={`Chiffre d'affaires annuel (millions, ${currencyObj.code})`}>
                        <input
                          type="number"
                          value={revenue}
                          onChange={(e) => setRevenue(Number(e.target.value))}
                        />
                      </LabeledInput>
                    </div>
                    <LabeledInput label="Devise">
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                      >
                        <optgroup label="Europe / International">
                          {CURRENCIES.filter((c) => c.region === 'Europe / International').map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.symbol} {c.code}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Afrique">
                          {CURRENCIES.filter((c) => c.region === 'Afrique').map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.symbol} {c.code}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </LabeledInput>
                  </div>
                  <LabeledInput label="Secteur d'activité">
                    <select
                      value={sector}
                      onChange={(e) => setSector(e.target.value as (typeof SECTORS)[number]['id'])}
                    >
                      {SECTORS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </LabeledInput>
                  <LabeledInput label="Type d'entreprise">
                    <select
                      value={companyType}
                      onChange={(e) =>
                        setCompanyType(e.target.value as (typeof COMPANY_TYPES)[number]['id'])
                      }
                    >
                      {COMPANY_TYPES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </LabeledInput>
                  <LabeledInput label={`Budget CarboScan annuel estimé (${currencyObj.code})`}>
                    <input
                      type="number"
                      value={subscription}
                      onChange={(e) => setSubscription(Number(e.target.value))}
                    />
                  </LabeledInput>
                </div>
              </div>
            )}

            {stepIndex === 1 && (
              <div>
                <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
                  <Zap size={20} className="text-[#4FD88C]" /> Efficacité opérationnelle
                </h2>
                <p className="text-[#8A9490] mb-8 max-w-xl">
                  Le temps que votre équipe passe aujourd&apos;hui sur le reporting carbone manuel.
                </p>
                <div className="max-w-lg">
                  <SliderField
                    label="Temps de reporting / mois"
                    value={`${hoursPerMonth} h`}
                    min={5}
                    max={160}
                    state={hoursPerMonth}
                    setState={setHoursPerMonth}
                  />
                  <SliderField
                    label="Coût horaire chargé moyen"
                    value={fmtMoney(hourlyCost)}
                    min={30}
                    max={150}
                    step={5}
                    state={hourlyCost}
                    setState={setHourlyCost}
                  />
                  <SliderField
                    label="Personnes impliquées"
                    value={`${peopleInvolved}`}
                    min={1}
                    max={10}
                    state={peopleInvolved}
                    setState={setPeopleInvolved}
                  />
                </div>
              </div>
            )}

            {stepIndex === 2 && (
              <div>
                <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
                  <TrendingUp size={20} className="text-[#5FB8E8]" /> Croissance business
                </h2>
                <p className="text-[#8A9490] mb-8 max-w-xl">
                  De plus en plus d&apos;appels d&apos;offres exigent une preuve de conformité carbone crédible.
                </p>
                <div className="max-w-lg">
                  <SliderField
                    label="Part des appels d'offres exigeant une preuve carbone"
                    value={`${rfpSharePct} %`}
                    min={0}
                    max={100}
                    state={rfpSharePct}
                    setState={setRfpSharePct}
                  />
                  <SliderField
                    label="Valeur moyenne des contrats concernés"
                    value={fmtMoney(avgContractValue)}
                    min={10000}
                    max={5000000}
                    step={10000}
                    state={avgContractValue}
                    setState={setAvgContractValue}
                  />
                  <div className="flex items-center justify-between mt-6 mb-2">
                    <span className="text-sm text-[#C4C9C5]">
                      Avez-vous déjà perdu un contrat pour non-conformité carbone ?
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <ToggleButton active={!lostDealBefore} onClick={() => setLostDealBefore(false)}>
                      Non
                    </ToggleButton>
                    <ToggleButton active={lostDealBefore} onClick={() => setLostDealBefore(true)}>
                      Oui
                    </ToggleButton>
                  </div>
                </div>
              </div>
            )}

            {stepIndex === 3 && (
              <div>
                <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
                  <Landmark size={20} className="text-[#F2A93B]" /> Accès au capital
                </h2>
                <p className="text-[#8A9490] mb-8 max-w-xl">
                  Un reporting carbone crédible peut faciliter l&apos;accès à des financements verts à taux
                  préférentiel.
                </p>
                <div className="max-w-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#C4C9C5]">Recherchez-vous un financement externe ?</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-6">
                    <ToggleButton active={seekingFinancing} onClick={() => setSeekingFinancing(true)}>
                      Oui
                    </ToggleButton>
                    <ToggleButton active={!seekingFinancing} onClick={() => setSeekingFinancing(false)}>
                      Non
                    </ToggleButton>
                  </div>
                  {seekingFinancing && (
                    <>
                      <SliderField
                        label="Montant de financement visé"
                        value={fmtMoney(financingAmount)}
                        min={100000}
                        max={20000000}
                        step={100000}
                        state={financingAmount}
                        setState={setFinancingAmount}
                      />
                      <SliderField
                        label="Réduction de taux estimée"
                        value={`${(rateReductionBps / 100).toFixed(2)} pts`}
                        min={5}
                        max={100}
                        state={rateReductionBps}
                        setState={setRateReductionBps}
                      />
                    </>
                  )}
                </div>
              </div>
            )}

            {stepIndex === 4 && (
              <div className="relative">
                <h2 className="text-2xl font-bold mb-3">Vos résultats</h2>
                <p className="text-[#8A9490] mb-8 max-w-xl">
                  Estimation du retour sur investissement de CarboScan pour votre entreprise, décomposé par
                  levier.
                </p>

                <div className="relative bg-[#121715] border border-[#2A3330] rounded-lg p-6 overflow-hidden mb-6">
                  <div className="scan-line" />
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <Stat
                      label="ROI première année"
                      value={`${results.roiPercent >= 0 ? '+' : ''}${fmt(results.roiPercent)} %`}
                      highlight
                    />
                    <Stat
                      label="Point mort"
                      value={
                        results.paybackMonths === Infinity
                          ? '—'
                          : `${results.paybackMonths.toFixed(1)} mois`
                      }
                    />
                    <Stat label="Gains annuels totaux" value={fmtMoney(results.totalGains)} />
                    <Stat label="Budget CarboScan" value={fmtMoney(subscription)} />
                  </div>

                  <div className="mono text-[10px] tracking-[0.2em] uppercase text-[#8A9490] mb-3">
                    Répartition des gains par levier
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={breakdown}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={45}
                            outerRadius={80}
                            paddingAngle={3}
                          >
                            {breakdown.map((b, i) => (
                              <Cell key={i} fill={b.color} stroke="#0B0F0E" strokeWidth={2} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: '#0B0F0E',
                              border: '1px solid #2A3330',
                              borderRadius: 6,
                            }}
                            formatter={(v: number) => fmtMoney(v)}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {breakdown.map((b) => (
                        <div key={b.name} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-[#C4C9C5]">
                            <span
                              className="w-2.5 h-2.5 rounded-sm inline-block"
                              style={{ background: b.color }}
                            />
                            {b.name}
                          </span>
                          <span className="mono text-[#EAEAE2]">{fmtMoney(b.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[#8A9490] text-xs mb-6">
                  <ShieldAlert size={14} />
                  Estimation indicative basée sur les paramètres saisis. Ne constitue pas un engagement
                  contractuel.
                </div>

                <Link
                  to="/demo"
                  className="inline-flex bg-[#4FD88C] text-[#0B0F0E] font-semibold px-6 py-3 rounded-md hover:bg-[#3FC77B] transition-colors"
                >
                  Réserver une démo CarboScan
                </Link>
              </div>
            )}

            {stepIndex < STEPS.length - 1 && (
              <div className="flex items-center justify-between mt-10 max-w-lg">
                <button
                  type="button"
                  onClick={() => canGoPrev && setStepIndex(stepIndex - 1)}
                  disabled={!canGoPrev}
                  className={`flex items-center gap-1 px-4 py-2.5 rounded-md text-sm border border-[#2A3330] ${
                    canGoPrev
                      ? 'text-[#C4C9C5] hover:border-[#4FD88C]/50'
                      : 'text-[#3A4440] cursor-not-allowed'
                  }`}
                >
                  <ChevronLeft size={16} /> Précédent
                </button>
                <button
                  type="button"
                  onClick={() => canGoNext && setStepIndex(stepIndex + 1)}
                  className="flex items-center gap-1 px-5 py-2.5 rounded-md text-sm font-medium bg-[#4FD88C] text-[#0B0F0E] hover:bg-[#3FC77B] transition-colors"
                >
                  Continuer <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function LabeledInput({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm text-[#C4C9C5] mb-2">{label}</div>
      {children}
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  state,
  setState,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step?: number;
  state: number;
  setState: (v: number) => void;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-[#C4C9C5]">{label}</span>
        <span className="mono text-sm text-[#4FD88C]">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={state}
        onChange={(e) => setState(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-2.5 rounded-md text-sm font-medium transition-colors border ${
        active
          ? 'bg-[#4FD88C] text-[#0B0F0E] border-[#4FD88C]'
          : 'bg-transparent text-[#8A9490] border-[#2A3330] hover:border-[#4FD88C]/50'
      }`}
    >
      {children}
    </button>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md p-4 border ${
        highlight
          ? 'bg-[#4FD88C]/10 border-[#4FD88C]/40'
          : 'bg-[#0B0F0E]/50 border-[#2A3330]'
      }`}
    >
      <div className="text-[#8A9490] text-xs mb-1.5">{label}</div>
      <div className={`mono text-xl font-semibold ${highlight ? 'text-[#4FD88C]' : 'text-[#EAEAE2]'}`}>
        {value}
      </div>
    </div>
  );
}

export default CarboScanROIWizard;
