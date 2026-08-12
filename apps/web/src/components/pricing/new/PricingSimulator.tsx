import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, ArrowRight, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface SimulatorData {
  sector: string;
  size: string;
  employees?: number;
  revenue?: number;
  objective: string;
}

export const PricingSimulator: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<SimulatorData>({
    sector: '',
    size: '',
    objective: '',
  });
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);

  const sectors = [
    { value: 'industrie', label: t('newPricing.simulator.sectors.industrie') },
    { value: 'agroalimentaire', label: t('newPricing.simulator.sectors.agroalimentaire') },
    { value: 'services', label: t('newPricing.simulator.sectors.services') },
    { value: 'logistique', label: t('newPricing.simulator.sectors.logistique') },
    { value: 'tech', label: t('newPricing.simulator.sectors.tech') },
    { value: 'autre', label: t('newPricing.simulator.sectors.autre') },
  ];

  const sizeOptions = [
    { value: '1-10', label: t('newPricing.simulator.sizes.1-10') },
    { value: '11-50', label: t('newPricing.simulator.sizes.11-50') },
    { value: '51-100', label: t('newPricing.simulator.sizes.51-100') },
    { value: '101-250', label: t('newPricing.simulator.sizes.101-250') },
    { value: '251-500', label: t('newPricing.simulator.sizes.251-500') },
    { value: '500+', label: t('newPricing.simulator.sizes.500+') },
  ];

  const objectives = [
    { value: 'premiere', label: t('newPricing.simulator.objectives.premiere') },
    { value: 'reduction', label: t('newPricing.simulator.objectives.reduction') },
    { value: 'sur-mesure', label: t('newPricing.simulator.objectives.sur-mesure') },
  ];

  const calculateEstimate = (simulatorData: SimulatorData) => {
    // Vérifier que toutes les données sont présentes
    if (!simulatorData.sector || !simulatorData.size || !simulatorData.objective) {
      return;
    }

    // Logique de calcul simplifiée (prix annuels en DT)
    let basePrice = 0;

    // Base selon la taille (prix annuels)
    if (simulatorData.size === '1-10') basePrice = 1900;
    else if (simulatorData.size === '11-50') basePrice = 2900;
    else if (simulatorData.size === '51-100') basePrice = 5000;
    else if (simulatorData.size === '101-250') basePrice = 8000;
    else if (simulatorData.size === '251-500') basePrice = 12000;
    else if (simulatorData.size === '500+') basePrice = 18000;

    // Ajustement selon l'objectif
    if (simulatorData.objective === 'reduction') basePrice *= 1.2;
    else if (simulatorData.objective === 'sur-mesure') basePrice *= 1.5;

    setEstimatedPrice(basePrice);
    setStep(4);
  };

  const handleDownloadGuide = () => {
    toast({
      title: 'Guide téléchargé',
      description: 'Le guide des tarifs sera bientôt disponible.',
    });
    // TODO: Implémenter le téléchargement réel du PDF
  };

  return (
    <section id="simulator-section" className="py-16 bg-white">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('newPricing.simulator.title')}
          </h2>
          <p className="text-lg text-gray-600">
            {t('newPricing.simulator.subtitle')}
          </p>
        </div>

        <Card className="border-2 border-[#009879]">
          <CardHeader>
            <CardTitle className="text-center">
              {t('newPricing.simulator.cardTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <Label htmlFor="sector" className="text-lg">
                  {t('newPricing.simulator.step1')}
                </Label>
                <Select
                  value={data.sector}
                  onValueChange={(value) => {
                    setData({ ...data, sector: value });
                    setStep(2);
                  }}
                >
                  <SelectTrigger id="sector" className="h-12">
                    <SelectValue placeholder={t('newPricing.simulator.step1')} />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((sector) => (
                      <SelectItem key={sector.value} value={sector.value}>
                        {sector.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!data.sector}
                    className="bg-[#009879] hover:bg-[#007a63] text-white"
                    size="lg"
                  >
                    {t('common.next')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <Label htmlFor="size" className="text-lg">
                  {t('newPricing.simulator.step2')}
                </Label>
                <Select
                  value={data.size}
                  onValueChange={(value) => {
                    setData({ ...data, size: value });
                    setStep(3);
                  }}
                >
                  <SelectTrigger id="size" className="h-12">
                    <SelectValue placeholder={t('newPricing.simulator.step2')} />
                  </SelectTrigger>
                  <SelectContent>
                    {sizeOptions.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="border-[#009879] text-[#009879] hover:bg-[#009879] hover:text-white"
                    size="lg"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    {t('common.previous')}
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!data.size}
                    className="bg-[#009879] hover:bg-[#007a63] text-white"
                    size="lg"
                  >
                    {t('common.next')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <Label htmlFor="objective" className="text-lg">
                  {t('newPricing.simulator.step3')}
                </Label>
                <Select
                  value={data.objective}
                  onValueChange={(value) => {
                    const newData = { ...data, objective: value };
                    setData(newData);
                    // Calculer directement avec les nouvelles données
                    calculateEstimate(newData);
                  }}
                >
                  <SelectTrigger id="objective" className="h-12">
                    <SelectValue placeholder={t('newPricing.simulator.step3')} />
                  </SelectTrigger>
                  <SelectContent>
                    {objectives.map((obj) => (
                      <SelectItem key={obj.value} value={obj.value}>
                        {obj.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="border-[#009879] text-[#009879] hover:bg-[#009879] hover:text-white"
                    size="lg"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    {t('common.previous')}
                  </Button>
                  <Button
                    onClick={() => {
                      if (data.objective) {
                        calculateEstimate({ ...data, objective: data.objective });
                      }
                    }}
                    disabled={!data.objective}
                    className="bg-[#009879] hover:bg-[#007a63] text-white"
                    size="lg"
                  >
                    {t('common.next')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6 text-center">
                <div className="bg-[#009879]/10 rounded-lg p-8">
                  <p className="text-gray-600 mb-4">
                    {t('newPricing.simulator.result.text', {
                      sector: sectors.find(s => s.value === data.sector)?.label || '',
                      size: sizeOptions.find(s => s.value === data.size)?.label || '',
                    })}
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    {t('newPricing.simulator.result.note')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t('newPricing.simulator.result.cta')}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={handleDownloadGuide}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    {t('newPricing.simulator.downloadGuide')}
                  </Button>
                  <Button
                    onClick={() => {
                      document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="flex-1 bg-[#009879] hover:bg-[#007a63] text-white"
                    size="lg"
                  >
                    {t('newPricing.simulator.getEstimate')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => {
                    setStep(1);
                    setData({ sector: '', size: '', objective: '' });
                    setEstimatedPrice(null);
                  }}
                >
                  {t('newPricing.simulator.newEstimate')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

