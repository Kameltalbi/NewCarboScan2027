import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Zap, Car, Factory, Recycle, Users, Clock, ChevronLeft,
  CheckCircle, BarChart3, ArrowRight, Leaf, Shield, Check
} from 'lucide-react';
import { api } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useTranslation } from 'react-i18next';

interface QuestionDef {
  id: number;
  sectionKey: string;
  sectionIcon: React.ElementType;
  qKey: string; // maps to freeCalculators.bilan.q.<qKey>
  type: 'text' | 'number' | 'select';
  field: string;
  required?: boolean;
  unit?: string;
  optionsKey?: string; // maps to freeCalculators.bilan.opt.<optionsKey>
  optionValues?: string[]; // list of values for select options
}

const QUESTIONS: QuestionDef[] = [
  { id: 1, sectionKey: 'company', sectionIcon: Building2, qKey: 'companyName', type: 'text', field: 'company_name', required: true },
  { id: 2, sectionKey: 'company', sectionIcon: Building2, qKey: 'sector', type: 'select', field: 'sector', required: true, optionsKey: 'sector', optionValues: ['services','industrie','btp','commerce','transport','agroalimentaire','sante','education','hotellerie','autre'] },
  { id: 3, sectionKey: 'company', sectionIcon: Building2, qKey: 'referenceYear', type: 'number', field: 'reference_year', required: true },
  { id: 4, sectionKey: 'company', sectionIcon: Users, qKey: 'employees', type: 'number', field: 'employees', required: true },
  { id: 5, sectionKey: 'company', sectionIcon: Building2, qKey: 'revenue', type: 'number', field: 'revenue' },

  { id: 6, sectionKey: 'scope1Energy', sectionIcon: Factory, qKey: 'gas', type: 'number', field: 'gas_m3', unit: 'm³' },
  { id: 7, sectionKey: 'scope1Energy', sectionIcon: Factory, qKey: 'fuel', type: 'number', field: 'fuel_liters', unit: 'L' },
  { id: 8, sectionKey: 'scope1Fleet', sectionIcon: Car, qKey: 'fleetFuel', type: 'select', field: 'fleet_fuel', optionsKey: 'fleetFuel', optionValues: ['essence','diesel','mixte','aucun'] },
  { id: 9, sectionKey: 'scope1Fleet', sectionIcon: Car, qKey: 'fleetLiters', type: 'number', field: 'fleet_fuel_liters', unit: 'L' },
  { id: 10, sectionKey: 'scope1Fleet', sectionIcon: Car, qKey: 'fleetKm', type: 'number', field: 'fleet_km', unit: 'km' },
  { id: 11, sectionKey: 'scope1Fluids', sectionIcon: Factory, qKey: 'refrigerant', type: 'number', field: 'refrigerant_kg', unit: 'kg' },

  { id: 12, sectionKey: 'scope2Elec', sectionIcon: Zap, qKey: 'electricity', type: 'number', field: 'electricity_kwh', unit: 'kWh', required: true },
  { id: 13, sectionKey: 'scope2Elec', sectionIcon: Zap, qKey: 'heat', type: 'number', field: 'heat_kwh', unit: 'kWh' },
  { id: 14, sectionKey: 'scope2Elec', sectionIcon: Zap, qKey: 'renewable', type: 'number', field: 'renewable_pct', unit: '%' },

  { id: 15, sectionKey: 'scope3Purchases', sectionIcon: Building2, qKey: 'purchases', type: 'number', field: 'purchases_dt', unit: 'DT', required: true },
  { id: 16, sectionKey: 'scope3Purchases', sectionIcon: Building2, qKey: 'rawMaterials', type: 'number', field: 'raw_materials_t', unit: 't' },
  { id: 17, sectionKey: 'scope3Travel', sectionIcon: Car, qKey: 'tripsCar', type: 'number', field: 'trips_car' },
  { id: 18, sectionKey: 'scope3Travel', sectionIcon: Car, qKey: 'tripsTrain', type: 'number', field: 'trips_train' },
  { id: 19, sectionKey: 'scope3Travel', sectionIcon: Car, qKey: 'tripsFlight', type: 'number', field: 'trips_flight' },
  { id: 20, sectionKey: 'scope3Commute', sectionIcon: Users, qKey: 'commuteMode', type: 'select', field: 'commute_mode', optionsKey: 'commuteMode', optionValues: ['voiture','transport_public','mixte','velo'] },
  { id: 21, sectionKey: 'scope3Commute', sectionIcon: Users, qKey: 'commuteKm', type: 'number', field: 'commute_km', unit: 'km' },
  { id: 22, sectionKey: 'scope3Freight', sectionIcon: Car, qKey: 'freightT', type: 'number', field: 'freight_t', unit: 't' },
  { id: 23, sectionKey: 'scope3Freight', sectionIcon: Car, qKey: 'freightMode', type: 'select', field: 'freight_mode', optionsKey: 'freightMode', optionValues: ['camion','maritime','mixte','aucun'] },
  { id: 24, sectionKey: 'scope3Waste', sectionIcon: Recycle, qKey: 'wasteT', type: 'number', field: 'waste_t', unit: 't' },
  { id: 25, sectionKey: 'scope3Waste', sectionIcon: Recycle, qKey: 'wasteTreatment', type: 'select', field: 'waste_treatment', optionsKey: 'wasteTreatment', optionValues: ['recyclage','incineration','decharge','mixte'] },
];

const TOTAL_QUESTIONS = QUESTIONS.length;
const ESTIMATED_MINUTES = 8;

const SECTIONS = QUESTIONS.reduce<{ sectionKey: string; sectionIcon: React.ElementType; questions: QuestionDef[] }[]>((acc, q) => {
  const existing = acc.find(s => s.sectionKey === q.sectionKey);
  if (existing) existing.questions.push(q);
  else acc.push({ sectionKey: q.sectionKey, sectionIcon: q.sectionIcon, questions: [q] });
  return acc;
}, []);
const TOTAL_SECTIONS = SECTIONS.length;

const BilanGratuit: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [step, setStep] = useState<'intro' | 'questions' | 'results' | 'calculating'>('intro');
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [data, setData] = useState<Record<string, string>>({});
  const [emissions, setEmissions] = useState<{
    scope1: number; scope2: number; scope3: number; total: number;
    categories: { key: string; value: number; scope: number }[];
    disclaimer?: string;
    resultHash?: string;
    factorPack?: string;
  } | null>(null);
  const navigate = useNavigate();

  const currentGroup = SECTIONS[currentSectionIdx];
  const progress = ((currentSectionIdx + 1) / TOTAL_SECTIONS) * 100;

  const tSection = (key: string) => t(`freeCalculators.bilan.sections.${key}`);

  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-xl border-0">
          <CardContent className="p-8 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-2xl">
              <Leaf className="h-10 w-10 text-green-600" />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('freeCalculators.bilan.intro.title')}</h1>
              <p className="text-gray-600">{t('freeCalculators.bilan.intro.subtitle')}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-blue-50 rounded-xl p-3">
                <div className="text-2xl font-bold text-blue-600">{TOTAL_QUESTIONS}</div>
                <div className="text-xs text-blue-700">{t('freeCalculators.bilan.intro.questions')}</div>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <div className="text-2xl font-bold text-green-600">3</div>
                <div className="text-xs text-green-700">{t('freeCalculators.bilan.intro.scopes')}</div>
              </div>
              <div className="bg-orange-50 rounded-xl p-3">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-2xl font-bold text-orange-600">~{ESTIMATED_MINUTES}</span>
                </div>
                <div className="text-xs text-orange-700">{t('freeCalculators.bilan.intro.minutes')}</div>
              </div>
            </div>

            <div className="text-left space-y-2 bg-gray-50 rounded-xl p-4">
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span dangerouslySetInnerHTML={{ __html: t('freeCalculators.bilan.intro.feat1') }} />
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>{t('freeCalculators.bilan.intro.feat2')}</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>{t('freeCalculators.bilan.intro.feat3')}</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <Shield className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>{t('freeCalculators.bilan.intro.feat4')}</span>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
              onClick={() => setStep('questions')}
            >
              {t('freeCalculators.bilan.intro.start')}
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>

            <p className="text-xs text-gray-400">
              {t('freeCalculators.bilan.intro.proHint')}{' '}
              <button onClick={() => navigate('/contact')} className="underline text-green-600 hover:text-green-700">
                {t('freeCalculators.bilan.intro.proLink')}
              </button>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'calculating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50">
        <Card className="p-8 text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto" />
          <p className="text-gray-600">Calcul déterministe en cours (moteur serveur)…</p>
        </Card>
      </div>
    );
  }

  if (step === 'results' && emissions) {
    const scopeData = [
      { name: 'Scope 1', value: emissions.scope1, color: '#00BF72', descKey: 'scope1Desc' },
      { name: 'Scope 2', value: emissions.scope2, color: '#00BDCE', descKey: 'scope2Desc' },
      { name: 'Scope 3', value: emissions.scope3, color: '#FF851B', descKey: 'scope3Desc' },
    ];
    const categoryData = emissions.categories
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map(c => ({ name: t(`freeCalculators.bilan.cats.${c.key}`, c.key), value: +(c.value / 1000).toFixed(2), scope: c.scope }));

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">{t('freeCalculators.bilan.results.title')}</h1>
            <p className="text-gray-600">
              {data.company_name || t('freeCalculators.bilan.results.yourCompany')} — {t('freeCalculators.bilan.results.year')} {data.reference_year || new Date().getFullYear()}
            </p>
          </div>

          <Card className="bg-gradient-to-r from-green-600 to-emerald-700 text-white border-0 shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="text-6xl font-extrabold mb-1">{(emissions.total / 1000).toFixed(1)}</div>
              <div className="text-xl opacity-90">{t('freeCalculators.bilan.results.unit')}</div>
              <div className="mt-4 flex justify-center gap-6 text-sm opacity-80">
                <span>Scope 1 : {(emissions.scope1 / 1000).toFixed(1)} t</span>
                <span>Scope 2 : {(emissions.scope2 / 1000).toFixed(1)} t</span>
                <span>Scope 3 : {(emissions.scope3 / 1000).toFixed(1)} t</span>
              </div>
              {emissions.disclaimer && (
                <p className="mt-4 text-xs opacity-80 max-w-2xl mx-auto">{emissions.disclaimer}</p>
              )}
              {emissions.resultHash && (
                <p className="text-[11px] opacity-70">hash {emissions.resultHash} · {emissions.factorPack}</p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />{t('freeCalculators.bilan.results.byScope')}</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={scopeData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {scopeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `${(Number(v) / 1000).toFixed(1)} t CO₂e`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  {scopeData.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="font-medium">{s.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{t('freeCalculators.bilan.results.scopeDetail')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {scopeData.map((s, i) => (
                  <div key={i} className="flex justify-between items-center p-4 rounded-xl" style={{ backgroundColor: s.color + '10' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: s.color }} />
                      <div>
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-xs text-gray-500">{t(`freeCalculators.bilan.results.${s.descKey}`)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{(s.value / 1000).toFixed(1)} t</div>
                      <div className="text-xs text-gray-500">{emissions.total > 0 ? ((s.value / emissions.total) * 100).toFixed(0) : 0}%</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {categoryData.length > 0 && (
            <Card>
              <CardHeader><CardTitle>{t('freeCalculators.bilan.results.topCategories')}</CardTitle></CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical" margin={{ left: 140 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => [`${Number(v).toFixed(1)} t CO₂e`, t('freeCalculators.bilan.results.emissionsLabel')]} />
                      <Bar dataKey="value" fill="#16a34a" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-0 shadow-xl">
            <CardContent className="p-8 text-center space-y-4">
              <h3 className="text-2xl font-bold">{t('freeCalculators.bilan.results.upsellTitle')}</h3>
              <p className="opacity-90 max-w-xl mx-auto">{t('freeCalculators.bilan.results.upsellText')}</p>
              <div className="flex justify-center gap-3">
                <Button size="lg" variant="secondary" className="bg-white text-blue-700 hover:bg-blue-50" onClick={() => navigate('/contact')}>
                  {t('freeCalculators.bilan.results.seeOffers')}
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" onClick={() => navigate('/contact')}>
                  {t('freeCalculators.bilan.results.contactExpert')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button variant="ghost" onClick={() => { setStep('intro'); setCurrentSectionIdx(0); setData({}); setEmissions(null); }}>
              {t('freeCalculators.bilan.results.restart')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const SectionIcon = currentGroup.sectionIcon;

  const canGoNext = () => {
    const requiredFields = currentGroup.questions.filter(q => q.required);
    return requiredFields.every(q => !!data[q.field] && data[q.field] !== '');
  };

  const goNext = async () => {
    if (currentSectionIdx < TOTAL_SECTIONS - 1) {
      setCurrentSectionIdx(currentSectionIdx + 1);
      return;
    }
    setStep('calculating');
    try {
      const result = await api.calculateFreeBilan(data, {
        companyName: data.company_name,
        email: data.email || undefined,
      });
      setEmissions({
        scope1: result.totals.scope1,
        scope2: result.totals.scope2,
        scope3: result.totals.scope3,
        total: result.totals.total,
        categories: result.categories.map((c) => ({
          key: c.key,
          value: c.value,
          scope: c.scope,
        })),
        disclaimer: result.disclaimer,
        resultHash: result.resultHash,
        factorPack: result.factorPack,
      });
      setStep('results');
    } catch (e) {
      toast({
        title: 'Calcul impossible',
        description: e instanceof Error ? e.message : 'Erreur',
        variant: 'destructive',
      });
      setStep('questions');
    }
  };

  const goPrev = () => {
    if (currentSectionIdx > 0) setCurrentSectionIdx(currentSectionIdx - 1);
    else setStep('intro');
  };

  const sidebarSections = SECTIONS.map((s, i) => ({
    ...s,
    isCompleted: i < currentSectionIdx,
    isActive: i === currentSectionIdx,
    index: i,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>~{Math.max(1, Math.round(ESTIMATED_MINUTES * (1 - progress / 100)))} {t('freeCalculators.bilan.questions.minutesLeft')}</span>
          </div>
          <span className="font-medium">{currentSectionIdx + 1} / {TOTAL_SECTIONS}</span>
        </div>

        <div className="flex gap-1 mb-6">
          {SECTIONS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full flex-1 transition-colors ${i <= currentSectionIdx ? 'bg-green-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        <div className="flex gap-8">
          <div className="hidden md:block w-52 shrink-0">
            <nav className="space-y-1">
              {sidebarSections.map((s) => (
                <button
                  key={s.sectionKey}
                  onClick={() => s.index <= currentSectionIdx && setCurrentSectionIdx(s.index)}
                  disabled={s.index > currentSectionIdx}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors text-left ${
                    s.isActive ? 'bg-green-50 text-green-700 font-medium' :
                    s.isCompleted ? 'text-gray-700 hover:bg-gray-50 cursor-pointer' :
                    'text-gray-400'
                  }`}
                >
                  <span className="truncate">{tSection(s.sectionKey)}</span>
                  {s.isCompleted && <Check className="h-4 w-4 text-green-500 ml-auto shrink-0" />}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 max-w-xl">
            <div className="flex items-center gap-2 mb-6">
              <Badge variant="outline" className="text-xs bg-white">
                <SectionIcon className="h-3 w-3 mr-1" />
                {tSection(currentGroup.sectionKey)}
              </Badge>
              <span className="text-xs text-gray-400">
                {t('freeCalculators.bilan.questions.questionCount', { count: currentGroup.questions.length })}
              </span>
            </div>

            <Card className="shadow-lg border-0">
              <CardContent className="p-6 md:p-8 space-y-6">
                {currentGroup.questions.map((q, idx) => {
                  const label = t(`freeCalculators.bilan.q.${q.qKey}.q`);
                  const placeholder = t(`freeCalculators.bilan.q.${q.qKey}.p`);
                  return (
                    <div key={q.id} className={idx > 0 ? 'pt-4 border-t border-gray-100' : ''}>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {label}
                        {q.required && <span className="text-red-500 ml-1">*</span>}
                      </label>

                      {q.type === 'text' && (
                        <Input
                          value={data[q.field] || ''}
                          onChange={e => setData({ ...data, [q.field]: e.target.value })}
                          placeholder={placeholder}
                          className="text-base"
                        />
                      )}

                      {q.type === 'number' && (
                        <div className="relative">
                          <Input
                            type="number"
                            value={data[q.field] || ''}
                            onChange={e => setData({ ...data, [q.field]: e.target.value })}
                            placeholder={placeholder}
                            className="text-base pr-16"
                          />
                          {q.unit && (
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">{q.unit}</span>
                          )}
                        </div>
                      )}

                      {q.type === 'select' && q.optionValues && q.optionsKey && (
                        <Select value={data[q.field] || ''} onValueChange={v => setData({ ...data, [q.field]: v })}>
                          <SelectTrigger className="text-base">
                            <SelectValue placeholder={placeholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {q.optionValues.map(v => (
                              <SelectItem key={v} value={v}>
                                {t(`freeCalculators.bilan.opt.${q.optionsKey}.${v}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {!q.required && q.type !== 'select' && (
                        <p className="text-xs text-gray-400 mt-1">{t('freeCalculators.bilan.questions.optional')}</p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="flex justify-between mt-6">
              <Button variant="ghost" onClick={goPrev}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                {currentSectionIdx === 0 ? t('freeCalculators.bilan.questions.home') : t('freeCalculators.bilan.questions.back')}
              </Button>
              <Button
                onClick={goNext}
                disabled={!canGoNext()}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {currentSectionIdx === TOTAL_SECTIONS - 1 ? t('freeCalculators.bilan.questions.seeResults') : t('freeCalculators.bilan.questions.next')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BilanGratuit;
