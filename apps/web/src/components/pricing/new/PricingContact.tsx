import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Mail, Calendar, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export const PricingContact: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    employees: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: 'Demande envoyée',
      description: 'Nous vous contacterons sous 48h.',
    });
    // TODO: Implémenter l'envoi réel du formulaire
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      employees: '',
      message: '',
    });
  };

  const employeeOptions = [
    t('newPricing.simulator.sizes.1-10'),
    t('newPricing.simulator.sizes.11-50'),
    t('newPricing.simulator.sizes.51-100'),
    t('newPricing.simulator.sizes.101-250'),
    t('newPricing.simulator.sizes.251-500'),
    t('newPricing.simulator.sizes.500+'),
  ];

  return (
    <section id="contact-section" className="py-16 bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('newPricing.contact.title')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('newPricing.contact.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulaire */}
          <Card className="border-2 border-[#009879]">
            <CardHeader>
              <CardTitle>{t('newPricing.contact.form.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">{t('newPricing.contact.form.name')} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="company">{t('newPricing.contact.form.company')} *</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">{t('newPricing.contact.form.email')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone">{t('newPricing.contact.form.phone')} *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="employees">{t('newPricing.contact.form.employees')}</Label>
                  <Select
                    value={formData.employees}
                    onValueChange={(value) => setFormData({ ...formData, employees: value })}
                  >
                    <SelectTrigger id="employees">
                      <SelectValue placeholder={t('newPricing.contact.form.employees')} />
                    </SelectTrigger>
                    <SelectContent>
                      {employeeOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="message">{t('newPricing.contact.form.message')}</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#009879] hover:bg-[#007a63] text-white"
                  size="lg"
                >
                  <Send className="mr-2 h-5 w-5" />
                  {t('newPricing.contact.form.submit')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Options de contact */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('newPricing.contact.directContact.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#009879]/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="h-6 w-6 text-[#009879]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{t('newPricing.contact.directContact.phone')}</h3>
                    <a href="tel:+21655053505" className="text-[#009879] hover:underline">
                      +216 55 053 505
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#009879]/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-[#009879]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{t('newPricing.contact.directContact.email')}</h3>
                    <a href="mailto:contact@carboscan.io" className="text-[#009879] hover:underline">
                      contact@carboscan.io
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#009879]/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-6 w-6 text-[#009879]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{t('newPricing.contact.directContact.schedule')}</h3>
                    <Button
                      variant="outline"
                      onClick={() => {
                        // TODO: Intégrer Calendly ou autre système de réservation
                        toast({
                          title: 'Réservation',
                          description: 'Lien de réservation à venir.',
                        });
                      }}
                      className="mt-2"
                    >
                      {t('newPricing.contact.directContact.scheduleButton')}
                    </Button>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">
                    💡 {t('newPricing.contact.directContact.freeConsultation')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

