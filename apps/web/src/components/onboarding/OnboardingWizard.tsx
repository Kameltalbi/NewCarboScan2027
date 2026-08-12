import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from "@/integrations/api/client";
import { Building2, Users, Target, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const ONBOARDING_KEY = 'carboscan_onboarding_completed';

const SECTORS = [
  'Industrie', 'Transport & Logistique', 'BTP & Construction',
  'Énergie', 'Agroalimentaire', 'Services', 'Commerce & Distribution',
  'Santé', 'Éducation', 'Technologie', 'Autre'
];

const EMPLOYEE_RANGES = ['1-10', '11-50', '51-250', '251-1000', '1000+'];

interface OnboardingData {
  companyName: string;
  sector: string;
  country: string;
  employeeRange: string;
}

export const OnboardingWizard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    companyName: '',
    sector: '',
    country: 'Tunisie',
    employeeRange: '',
  });

  const steps = [
    { icon: Building2, title: t('onboarding.steps.organization'), desc: t('onboarding.steps.organizationDesc') },
    { icon: Users, title: t('onboarding.steps.team'), desc: t('onboarding.steps.teamDesc') },
    { icon: Target, title: t('onboarding.steps.ready'), desc: t('onboarding.steps.readyDesc') },
  ];

  const canProceed = () => {
    if (step === 0) return data.companyName.trim().length >= 2;
    if (step === 1) return data.sector && data.employeeRange;
    return true;
  };

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingOrg) {
        await supabase.from('organizations').update({
          name: data.companyName,
          sector: data.sector,
          country: data.country,
        }).eq('id', existingOrg.id);
      }

      await supabase.from('profiles').upsert({
        user_id: user.id,
        company_name: data.companyName,
      }, { onConflict: 'user_id' });

      localStorage.setItem(ONBOARDING_KEY, 'true');
      toast.success(t('onboarding.messages.success'));
      navigate('/app/dashboard');
    } catch {
      toast.error(t('onboarding.messages.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl" role="main" aria-label={t('onboarding.steps.organization')}>
        {/* Progress */}
        <nav aria-label="Onboarding progress" className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
                aria-current={i === step ? 'step' : undefined}
              >
                {i < step ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <s.icon className="h-4 w-4" aria-hidden="true" />}
                <span className="hidden sm:inline">{s.title}</span>
              </div>
              {i < steps.length - 1 && <div className={`h-0.5 w-8 ${i < step ? 'bg-primary' : 'bg-muted'}`} aria-hidden="true" />}
            </React.Fragment>
          ))}
        </nav>

        <Card className="border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {step === 0 && t('onboarding.titles.welcome')}
              {step === 1 && t('onboarding.titles.activity')}
              {step === 2 && t('onboarding.titles.allSet')}
            </CardTitle>
            <CardDescription>
              {step === 0 && t('onboarding.descriptions.welcome')}
              {step === 1 && t('onboarding.descriptions.activity')}
              {step === 2 && t('onboarding.descriptions.allSet')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="companyName">{t('onboarding.fields.companyName')} *</Label>
                  <Input
                    id="companyName"
                    placeholder={t('onboarding.fields.companyNamePlaceholder')}
                    value={data.companyName}
                    onChange={e => setData(d => ({ ...d, companyName: e.target.value }))}
                    autoFocus
                    aria-required="true"
                  />
                </div>
                <div>
                  <Label htmlFor="country">{t('onboarding.fields.country')}</Label>
                  <Select value={data.country} onValueChange={v => setData(d => ({ ...d, country: v }))}>
                    <SelectTrigger id="country" aria-label={t('onboarding.fields.country')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['Tunisie', 'France', 'Maroc', 'Algérie', 'Belgique', 'Suisse', 'Canada', 'Autre'].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="sector">{t('onboarding.fields.sector')} *</Label>
                  <Select value={data.sector} onValueChange={v => setData(d => ({ ...d, sector: v }))}>
                    <SelectTrigger id="sector" aria-label={t('onboarding.fields.sector')}>
                      <SelectValue placeholder={t('onboarding.fields.sectorPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTORS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="employees">{t('onboarding.fields.employees')} *</Label>
                  <Select value={data.employeeRange} onValueChange={v => setData(d => ({ ...d, employeeRange: v }))}>
                    <SelectTrigger id="employees" aria-label={t('onboarding.fields.employees')}>
                      <SelectValue placeholder={t('onboarding.fields.employeesPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYEE_RANGES.map(r => (
                        <SelectItem key={r} value={r}>{r} {t('onboarding.fields.employeesUnit')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3 bg-muted/50 rounded-lg p-4" role="list" aria-label={t('onboarding.steps.readyDesc')}>
                <div className="flex justify-between" role="listitem">
                  <span className="text-muted-foreground">{t('onboarding.summary.organization')}</span>
                  <span className="font-medium">{data.companyName}</span>
                </div>
                <div className="flex justify-between" role="listitem">
                  <span className="text-muted-foreground">{t('onboarding.summary.country')}</span>
                  <span className="font-medium">{data.country}</span>
                </div>
                <div className="flex justify-between" role="listitem">
                  <span className="text-muted-foreground">{t('onboarding.summary.sector')}</span>
                  <span className="font-medium">{data.sector}</span>
                </div>
                <div className="flex justify-between" role="listitem">
                  <span className="text-muted-foreground">{t('onboarding.summary.employees')}</span>
                  <span className="font-medium">{data.employeeRange}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
                <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                {t('onboarding.buttons.previous')}
              </Button>

              {step < 2 ? (
                <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
                  {t('onboarding.buttons.next')}
                  <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
                </Button>
              ) : (
                <Button onClick={handleComplete} disabled={loading}>
                  {loading ? t('onboarding.buttons.configuring') : t('onboarding.buttons.start')}
                  <CheckCircle2 className="h-4 w-4 ml-2" aria-hidden="true" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-4">
          <button
            onClick={() => {
              localStorage.setItem(ONBOARDING_KEY, 'true');
              navigate('/app/dashboard');
            }}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            {t('onboarding.buttons.skip')}
          </button>
        </div>
      </div>
    </div>
  );
};

export const useNeedsOnboarding = () => {
  const { user } = useAuth();
  const [needs, setNeeds] = useState(false);

  useEffect(() => {
    if (!user) { setNeeds(false); return; }
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (completed) { setNeeds(false); return; }
    supabase.from('organizations')
      .select('id, name, sector')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data || !data.sector) {
          setNeeds(true);
        } else {
          localStorage.setItem(ONBOARDING_KEY, 'true');
          setNeeds(false);
        }
      });
  }, [user]);

  return needs;
};
