import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Send, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export const PricingTariffSimulation: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast({
        title: t('pricing.modular.simulation.error.title'),
        description: t('pricing.modular.simulation.error.description'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    // TODO: Implémenter l'appel API pour envoyer l'email
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: t('pricing.modular.simulation.success.title'),
        description: t('pricing.modular.simulation.success.description'),
      });
      setEmail('');
    }, 1500);
  };

  const handleDownloadPDF = () => {
    // TODO: Implémenter le téléchargement du PDF
    toast({
      title: t('pricing.modular.simulation.pdf.title'),
      description: t('pricing.modular.simulation.pdf.description'),
    });
  };

  return (
    <section className="py-16 bg-[#F5F7F9]">
      <div className="container mx-auto max-w-4xl px-4">
        <Card className="border-2 border-[#00B8C9]">
          <CardHeader className="bg-gradient-to-r from-[#003B73] to-[#004B87] text-white rounded-t-lg">
            <CardTitle className="text-2xl font-bold text-center">
              {t('pricing.modular.simulation.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-center text-gray-600 mb-6">
              {t('pricing.modular.simulation.subtitle')}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-base font-semibold text-[#003B73]">
                  {t('pricing.modular.simulation.emailLabel')} *
                </Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('pricing.modular.simulation.emailPlaceholder')}
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#003B73] hover:bg-[#004B87] text-white py-6 text-lg font-semibold"
                  size="lg"
                >
                  <Send className="mr-2 h-5 w-5" />
                  {isSubmitting
                    ? t('pricing.modular.simulation.submitting')
                    : t('pricing.modular.simulation.submit')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadPDF}
                  className="flex-1 border-[#003B73] text-[#003B73] hover:bg-[#003B73]/10 py-6 text-lg font-semibold"
                  size="lg"
                >
                  <Download className="mr-2 h-5 w-5" />
                  {t('pricing.modular.simulation.downloadPDF')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

