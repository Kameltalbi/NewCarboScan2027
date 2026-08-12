import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { api } from "@/integrations/api/client";
import { Calculator, Mail, User, Building, Phone, MapPin, Briefcase } from 'lucide-react';

export const InscriptionCalculateurForm: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    sector: '',
    address: ''
  });

  const sectors = [
    'Agriculture, Foresterie et Pêche',
    'Industries extractives',
    'Industrie manufacturière',
    'Production et distribution d\'électricité, de gaz, de vapeur et d\'air conditionné',
    'Production et distribution d\'eau',
    'Construction',
    'Commerce de gros et de détail',
    'Transports et entreposage',
    'Hébergement et restauration',
    'Information et communication',
    'Activités financières et d\'assurance',
    'Activités immobilières',
    'Activités spécialisées, scientifiques et techniques',
    'Activités de services administratifs et de soutien',
    'Administration publique',
    'Enseignement',
    'Santé humaine et action sociale',
    'Arts, spectacles et activités récréatives',
    'Autres activités de services',
    'Services domestiques'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await api.submitLead({
        requestType: 'free_calculator',
        email: formData.email,
        phone: formData.phone,
        companyName: formData.company,
        fullName: formData.name,
        message: `Inscription calculateur gratuit - Secteur: ${formData.sector} - Adresse: ${formData.address}`,
        payload: { sector: formData.sector, address: formData.address },
      });

      toast({
        title: "Inscription réussie",
        description: "Merci pour votre inscription ! Vous allez être redirigé vers le calculateur.",
      });

      // Rediriger vers le calculateur
      setTimeout(() => {
        // Ici on peut rediriger vers la page du calculateur
        window.location.href = '/empreinte-produit-calculator';
      }, 2000);

    } catch (error) {
      console.error('Error saving form:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'inscription. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSelectChange = (value: string) => {
    setFormData({
      ...formData,
      sector: value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Calculator className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-primary">
            {t("inscriptionCalculator.title")}
          </CardTitle>
          <CardDescription>
            {t("inscriptionCalculator.subtitle")}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User size={16} />
                {t("inscriptionCalculator.fields.name")} *
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder={t("inscriptionCalculator.placeholders.name")}
                required
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail size={16} />
                {t("inscriptionCalculator.fields.email")} *
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t("inscriptionCalculator.placeholders.email")}
                required
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone size={16} />
                {t("inscriptionCalculator.fields.phone")} *
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder={t("inscriptionCalculator.placeholders.phone")}
                required
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="flex items-center gap-2">
                <Building size={16} />
                {t("inscriptionCalculator.fields.company")} *
              </Label>
              <Input
                id="company"
                name="company"
                type="text"
                placeholder={t("inscriptionCalculator.placeholders.company")}
                required
                value={formData.company}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sector" className="flex items-center gap-2">
                <Briefcase size={16} />
                Secteur d'activité *
              </Label>
              <Select onValueChange={handleSelectChange} required>
                <SelectTrigger>
                  <SelectValue placeholder="Ex: Industrie, Services, Commerce..." />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  {sectors.map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin size={16} />
                Adresse entreprise *
              </Label>
              <Input
                id="address"
                name="address"
                type="text"
                placeholder="Adresse complète de votre entreprise"
                required
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-green-accent hover:bg-green-accent/90"
              size="lg"
            >
              <Calculator className="mr-2" size={18} />
              {t("inscriptionCalculator.buttons.accessCalculator")}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 text-center">
              <strong>{t("inscriptionCalculator.freeInfo")}</strong>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};