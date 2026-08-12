import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Send, Mail, Phone, Building2, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export const PricingContactForm: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: Implémenter l'envoi réel du formulaire à l'API
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: t('pricing.modular.contactForm.success.title'),
        description: t('pricing.modular.contactForm.success.description'),
      });
      setFormData({
        name: '',
        company: '',
        email: '',
        phone: '',
        message: '',
      });
    }, 1500);
  };

  return (
    <div className="h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#009879] mb-2">
          {t('pricing.modular.contactForm.formTitle')}
        </h2>
        <p className="text-gray-600 text-sm">
          {t('pricing.modular.contactForm.subtitle')}
        </p>
      </div>
      <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="name" className="text-base font-semibold text-[#009879] mb-2 block">
                    {t('pricing.modular.contactForm.name')} *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('pricing.modular.contactForm.namePlaceholder')}
                      className="pl-10 h-12"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="company" className="text-base font-semibold text-[#009879] mb-2 block">
                    {t('pricing.modular.contactForm.company')} *
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder={t('pricing.modular.contactForm.companyPlaceholder')}
                      className="pl-10 h-12"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="email" className="text-base font-semibold text-[#009879] mb-2 block">
                    {t('pricing.modular.contactForm.email')} *
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder={t('pricing.modular.contactForm.emailPlaceholder')}
                      className="pl-10 h-12"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-base font-semibold text-[#009879] mb-2 block">
                    {t('pricing.modular.contactForm.phone')}
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder={t('pricing.modular.contactForm.phonePlaceholder')}
                      className="pl-10 h-12"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="message" className="text-base font-semibold text-[#009879] mb-2 block">
                  {t('pricing.modular.contactForm.message')}
                </Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder={t('pricing.modular.contactForm.messagePlaceholder')}
                  rows={5}
                  className="resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#003B73] hover:bg-[#004B87] text-white py-6 text-lg font-semibold"
                size="lg"
              >
                <Send className="mr-2 h-5 w-5" />
                {isSubmitting
                  ? t('pricing.modular.contactForm.submitting')
                  : t('pricing.modular.contactForm.submit')}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                {t('pricing.modular.contactForm.privacy')}
              </p>
            </form>
          </div>
    </div>
  );
};

