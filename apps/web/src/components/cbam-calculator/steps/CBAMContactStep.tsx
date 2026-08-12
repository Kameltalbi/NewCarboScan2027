import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { api } from "@/integrations/api/client";
import { AlertCircle, ChevronLeft, ChevronRight, User, Mail, Phone, Briefcase, Building, MapPin } from 'lucide-react';
import { CBAMData, CBAMResults } from '@/types/cbam';

interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  sector: string;
}

interface CBAMContactStepProps {
  data: CBAMData;
  results: CBAMResults;
  onNext: () => void;
  onPrevious: () => void;
}

export const CBAMContactStep: React.FC<CBAMContactStepProps> = ({
  data,
  results,
  onNext,
  onPrevious
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ContactInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    sector: ''
  });

  const [formErrors, setFormErrors] = useState<{ [field: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const validateForm = (): boolean => {
    const newErrors: { [field: string]: string } = {};

    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'Le prénom est requis';
    }

    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Le nom est requis';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    if (!formData.phone?.trim()) {
      newErrors.phone = 'Le téléphone est requis';
    }

    if (!formData.company?.trim()) {
      newErrors.company = 'Le nom de l\'organisation est requis';
    }

    if (!formData.address?.trim()) {
      newErrors.address = 'L\'adresse de l\'organisation est requise';
    }

    if (!formData.sector?.trim()) {
      newErrors.sector = 'Le secteur d\'activité est requis';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ContactInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, sector: value }));
    if (formErrors.sector) {
      setFormErrors(prev => ({ ...prev, sector: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Sauvegarder les informations de contact dans contact_requests
      await api.submitLead({
        requestType: 'cbam_calculator',
        email: formData.email,
        phone: formData.phone,
        companyName: formData.company,
        fullName: `${formData.firstName} ${formData.lastName}`,
        message: `CBAM Calculator - Nom: ${formData.firstName} ${formData.lastName} - Secteur: ${formData.sector} - Adresse: ${formData.address} - Émissions CBAM: ${results.totalEmissions.toFixed(2)} tCO2eq`,
        payload: { sector: formData.sector, address: formData.address, totalEmissions: results.totalEmissions },
      });

      toast({
        title: "Informations enregistrées",
        description: "Vos informations ont été sauvegardées avec succès.",
      });

      // Passer à l'étape suivante (résultats)
      onNext();

    } catch (error) {
      console.error('Error saving contact info:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Building className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Informations de contact
        </h2>
        <p className="text-gray-600">
          Ces informations nous permettront de vous envoyer votre rapport CBAM personnalisé.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* First Name */}
        <div className="space-y-2">
          <Label htmlFor="firstName" className="flex items-center">
            <User className="w-4 h-4 mr-2" />
            Prénom *
          </Label>
          <Input
            id="firstName"
            type="text"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            placeholder="Ex: Jean"
            className={formErrors.firstName ? 'border-red-500' : ''}
          />
          {formErrors.firstName && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {formErrors.firstName}
            </p>
          )}
        </div>

        {/* Last Name */}
        <div className="space-y-2">
          <Label htmlFor="lastName" className="flex items-center">
            <User className="w-4 h-4 mr-2" />
            Nom *
          </Label>
          <Input
            id="lastName"
            type="text"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            placeholder="Ex: Dupont"
            className={formErrors.lastName ? 'border-red-500' : ''}
          />
          {formErrors.lastName && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {formErrors.lastName}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center">
            <Mail className="w-4 h-4 mr-2" />
            Email professionnel *
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="votre.email@entreprise.com"
            className={formErrors.email ? 'border-red-500' : ''}
          />
          {formErrors.email && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {formErrors.email}
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center">
            <Phone className="w-4 h-4 mr-2" />
            Téléphone *
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="+216 XX XXX XXX"
            className={formErrors.phone ? 'border-red-500' : ''}
          />
          {formErrors.phone && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {formErrors.phone}
            </p>
          )}
        </div>

        {/* Company */}
        <div className="space-y-2">
          <Label htmlFor="company" className="flex items-center">
            <Building className="w-4 h-4 mr-2" />
            Entreprise *
          </Label>
          <Input
            id="company"
            type="text"
            value={formData.company}
            onChange={(e) => handleInputChange('company', e.target.value)}
            placeholder="Nom de votre entreprise"
            className={formErrors.company ? 'border-red-500' : ''}
          />
          {formErrors.company && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {formErrors.company}
            </p>
          )}
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="address" className="flex items-center">
            <MapPin className="w-4 h-4 mr-2" />
            Adresse entreprise *
          </Label>
          <Input
            id="address"
            type="text"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Adresse complète de votre entreprise"
            className={formErrors.address ? 'border-red-500' : ''}
          />
          {formErrors.address && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {formErrors.address}
            </p>
          )}
        </div>

        {/* Sector */}
        <div className="space-y-2">
          <Label htmlFor="sector" className="flex items-center">
            <Briefcase className="w-4 h-4 mr-2" />
            Secteur d'activité *
          </Label>
          <Select onValueChange={handleSelectChange} required>
            <SelectTrigger className={formErrors.sector ? 'border-red-500' : ''}>
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
          {formErrors.sector && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {formErrors.sector}
            </p>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={onPrevious} className="flex items-center">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Retour
          </Button>

          <Button
            type="submit"
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Enregistrement...' : 'Voir mon rapport CBAM'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </form>

      {/* Privacy notice */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">
              Protection des données
            </h4>
            <p className="text-blue-800 text-sm">
              Vos données personnelles sont traitées de manière confidentielle et utilisées 
              uniquement pour la génération de votre rapport CBAM. Elles ne seront pas 
              transmises à des tiers sans votre consentement.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};