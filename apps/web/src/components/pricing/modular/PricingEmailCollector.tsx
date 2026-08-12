import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PricingEmailCollectorProps {
  onEmailSubmit: (email: string) => void;
}

export const PricingEmailCollector: React.FC<PricingEmailCollectorProps> = ({ onEmailSubmit }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation basique de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError(t('pricing.modular.emailCollector.error'));
      return;
    }

    onEmailSubmit(email);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-[#00B8C9] shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-[#003B73] to-[#004B87] text-white rounded-t-lg">
          <CardTitle className="text-2xl font-bold text-center">
            {t('pricing.modular.emailCollector.title')}
          </CardTitle>
          <p className="text-center text-white/90 mt-2 text-sm">
            {t('pricing.modular.emailCollector.subtitle')}
          </p>
        </CardHeader>
        <CardContent className="pt-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-base font-semibold text-[#003B73] mb-2 block">
                {t('pricing.modular.emailCollector.emailLabel')} *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder={t('pricing.modular.emailCollector.emailPlaceholder')}
                  className="pl-10 h-12"
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 mt-2">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-[#003B73] hover:bg-[#004B87] text-white py-6 text-lg font-semibold"
              size="lg"
            >
              {t('pricing.modular.emailCollector.submit')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <p className="text-xs text-gray-500 text-center">
              {t('pricing.modular.emailCollector.privacy')}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

