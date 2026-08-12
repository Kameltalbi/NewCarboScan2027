import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AlertCircle, ChevronLeft, ChevronRight, User, Mail, Phone, Briefcase } from 'lucide-react';
import { ContactInfo } from '@/types/dynamicQuestionnaire';

interface ContactStepProps {
  contactInfo: Partial<ContactInfo>;
  onSubmit: (contactInfo: ContactInfo) => void;
  onBack: () => void;
  errors: { [field: string]: string };
}

export const ContactStep: React.FC<ContactStepProps> = ({
  contactInfo,
  onSubmit,
  onBack,
  errors
}) => {
  const [formData, setFormData] = useState<Partial<ContactInfo>>({
    firstName: contactInfo.firstName || '',
    lastName: contactInfo.lastName || '',
    email: contactInfo.email || '',
    phone: contactInfo.phone || '',
    position: contactInfo.position || '',
  });

  const [formErrors, setFormErrors] = useState<{ [field: string]: string }>({});

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

    if (!formData.position?.trim()) {
      newErrors.position = 'Le poste est requis';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData as ContactInfo);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <User className="mx-auto h-12 w-12 text-green-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Informations de contact
        </h2>
        <p className="text-gray-600">
          Ces informations nous permettront de vous envoyer votre rapport personnalisé.
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
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
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
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
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
            Email *
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="Ex: jean.dupont@entreprise.com"
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
            Téléphone
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="Ex: +33 1 23 45 67 89"
          />
          <p className="text-gray-500 text-sm">Optionnel</p>
        </div>

        {/* Position */}
        <div className="space-y-2">
          <Label htmlFor="position" className="flex items-center">
            <Briefcase className="w-4 h-4 mr-2" />
            Poste / Fonction *
          </Label>
          <Input
            id="position"
            type="text"
            value={formData.position}
            onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
            placeholder="Ex: Directeur Développement Durable"
            className={formErrors.position ? 'border-red-500' : ''}
          />
          {formErrors.position && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {formErrors.position}
            </p>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={onBack} className="flex items-center">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Retour
          </Button>

          <Button
            type="submit"
            className="flex items-center bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            Calculer mon bilan carbone
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
              uniquement pour la génération de votre rapport carbone. Elles ne seront pas 
              transmises à des tiers sans votre consentement.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}; 