import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Building2, Users, MapPin, Layers, Target, MessageSquare, Calendar, Award, Upload } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { CompanyInfo } from '@/types/dynamicQuestionnaire';

interface CompanyInfoStepProps {
  companyInfo: Partial<CompanyInfo>;
  onSubmit: (companyInfo: CompanyInfo) => void;
  errors: { [field: string]: string };
  countries: { value: string; label: string }[];
  sectors: { value: string; label: string }[];
}

export const CompanyInfoStep: React.FC<CompanyInfoStepProps> = ({
  companyInfo,
  onSubmit,
  errors,
  countries,
  sectors
}) => {
  const [formData, setFormData] = useState<Partial<CompanyInfo>>({
    companyName: companyInfo.companyName || '',
    address: companyInfo.address || '',
    country: companyInfo.country || '',
    numberOfSites: companyInfo.numberOfSites || 1,
    siteLocations: companyInfo.siteLocations || '',
    sectors: companyInfo.sectors || [],
    numberOfEmployees: companyInfo.numberOfEmployees || 0,
    surfaceArea: companyInfo.surfaceArea || 0,
    annualRevenue: companyInfo.annualRevenue || 0,
    studiedYear: companyInfo.studiedYear || new Date().getFullYear() - 1,
    // Nouveaux champs pour l'objectif de la démarche
    objective: companyInfo.objective || '',
    motivation: companyInfo.motivation || '',
    targetYear: companyInfo.targetYear || new Date().getFullYear() + 5,
    hasCommitments: companyInfo.hasCommitments || false,
    commitmentDetails: companyInfo.commitmentDetails || '',
    logoUrl: companyInfo.logoUrl || '',
  });

  const [formErrors, setFormErrors] = useState<{ [field: string]: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { [field: string]: string } = {};

    if (!formData.companyName?.trim()) {
      newErrors.companyName = 'Le nom de l\'entreprise est requis';
    }

    if (!formData.address?.trim()) {
      newErrors.address = 'L\'adresse de l\'entreprise est requise';
    }

    if (!formData.country) {
      newErrors.country = 'Le pays est requis';
    }

    if (!formData.numberOfSites || formData.numberOfSites <= 0) {
      newErrors.numberOfSites = 'Le nombre de sites doit être supérieur à 0';
    }

    if (formData.numberOfSites > 1 && !formData.siteLocations?.trim()) {
      newErrors.siteLocations = 'Veuillez préciser l\'emplacement des sites';
    }

    if (!formData.sectors || formData.sectors.length === 0) {
      newErrors.sectors = 'Au moins un secteur d\'activité est requis';
    }

    if (!formData.numberOfEmployees || formData.numberOfEmployees <= 0) {
      newErrors.numberOfEmployees = 'Le nombre d\'employés doit être supérieur à 0';
    }

    if (!formData.surfaceArea || formData.surfaceArea <= 0) {
      newErrors.surfaceArea = 'La surface des locaux doit être supérieure à 0';
    }

    if (!formData.annualRevenue || formData.annualRevenue <= 0) {
      newErrors.annualRevenue = 'Le chiffre d\'affaires doit être supérieur à 0';
    }

    if (!formData.studiedYear || formData.studiedYear < 2020 || formData.studiedYear > new Date().getFullYear()) {
      newErrors.studiedYear = 'L\'année d\'étude doit être valide';
    }

    // Validation des nouveaux champs objectif
    if (!formData.objective?.trim()) {
      newErrors.objective = 'L\'objectif de la démarche carbone est requis';
    }

    if (!formData.motivation?.trim()) {
      newErrors.motivation = 'La motivation/contexte de la démarche est requis';
    }

    if (formData.hasCommitments && !formData.commitmentDetails?.trim()) {
      newErrors.commitmentDetails = 'Veuillez préciser vos engagements existants';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData as CompanyInfo);
    }
  };

  const handleSectorChange = (sectorValue: string, checked: boolean) => {
    setFormData(prev => {
      const sectors = prev.sectors || [];
      if (checked) {
        return { ...prev, sectors: [...sectors, sectorValue] };
      } else {
        return { ...prev, sectors: sectors.filter(s => s !== sectorValue) };
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Building2 className="mx-auto h-12 w-12 text-green-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Informations de votre entreprise
        </h2>
        <p className="text-gray-600">
          Ces informations nous permettront de personnaliser votre questionnaire selon votre activité.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="companyName" className="flex items-center">
            <Building2 className="w-4 h-4 mr-2" />
            Nom complet de l'entreprise *
          </Label>
          <Input
            id="companyName"
            type="text"
            value={formData.companyName}
            onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
            placeholder="Ex: CarboScan SARL"
            className={formErrors.companyName ? 'border-red-500' : ''}
          />
          {formErrors.companyName && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {formErrors.companyName}
            </p>
          )}
        </div>

        {/* Company Address */}
        <div className="space-y-2">
          <Label htmlFor="address" className="flex items-center">
            <MapPin className="w-4 h-4 mr-2" />
            Adresse complète de l'entreprise *
          </Label>
          <Input
            id="address"
            type="text"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            placeholder="Ex: 123 Avenue de la République, 1001 Tunis, Tunisie"
            className={formErrors.address ? 'border-red-500' : ''}
          />
          {formErrors.address && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {formErrors.address}
            </p>
          )}
        </div>

        {/* Country */}
        <div className="space-y-2">
          <Label className="flex items-center">
            <MapPin className="w-4 h-4 mr-2" />
            Pays *
          </Label>
          <Select
            value={formData.country}
            onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
          >
            <SelectTrigger className={formErrors.country ? 'border-red-500' : ''}>
              <SelectValue placeholder="Sélectionnez votre pays" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formErrors.country && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {formErrors.country}
            </p>
          )}
        </div>

        {/* Number of Sites */}
        <div className="space-y-2">
          <Label htmlFor="numberOfSites" className="flex items-center">
            <Building2 className="w-4 h-4 mr-2" />
            Nombre de sites étudiés *
          </Label>
          <Input
            id="numberOfSites"
            type="number"
            min="1"
            value={formData.numberOfSites || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              numberOfSites: parseInt(e.target.value) || 0 
            }))}
            placeholder="Ex: 1"
            className={formErrors.numberOfSites ? 'border-red-500' : ''}
          />
          {formErrors.numberOfSites && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {formErrors.numberOfSites}
            </p>
          )}
        </div>

        {/* Site Locations (conditional) */}
        {formData.numberOfSites && formData.numberOfSites > 1 && (
          <div className="space-y-2">
            <Label htmlFor="siteLocations" className="flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Emplacement des sites *
            </Label>
            <Textarea
              id="siteLocations"
              value={formData.siteLocations || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, siteLocations: e.target.value }))}
              placeholder="Ex: Site 1: Tunis, Site 2: Sfax, Site 3: Sousse"
              className={formErrors.siteLocations ? 'border-red-500' : ''}
              rows={3}
            />
            {formErrors.siteLocations && (
              <p className="text-red-500 text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {formErrors.siteLocations}
              </p>
            )}
          </div>
        )}

        {/* Sectors */}
        <div className="space-y-2">
          <Label className="flex items-center">
            <Layers className="w-4 h-4 mr-2" />
            Secteurs d'activité * (plusieurs choix possibles)
          </Label>
          <Card className="p-4 max-h-60 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sectors.map((sector) => (
                <div key={sector.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={sector.value}
                    checked={formData.sectors?.includes(sector.value) || false}
                    onCheckedChange={(checked) => handleSectorChange(sector.value, checked as boolean)}
                  />
                  <Label
                    htmlFor={sector.value}
                    className="text-sm cursor-pointer hover:text-green-600"
                  >
                    {sector.label}
                  </Label>
                </div>
              ))}
            </div>
          </Card>
          {formErrors.sectors && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {formErrors.sectors}
            </p>
          )}
          {formData.sectors && formData.sectors.length > 0 && (
            <p className="text-green-600 text-sm">
              {formData.sectors.length} secteur(s) sélectionné(s)
            </p>
          )}
        </div>

        {/* Number of Employees */}
        <div className="space-y-2">
          <Label htmlFor="numberOfEmployees" className="flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Nombre d'employés *
          </Label>
          <Input
            id="numberOfEmployees"
            type="number"
            min="1"
            value={formData.numberOfEmployees || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              numberOfEmployees: parseInt(e.target.value) || 0 
            }))}
            placeholder="Ex: 25"
            className={formErrors.numberOfEmployees ? 'border-red-500' : ''}
          />
          {formErrors.numberOfEmployees && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {formErrors.numberOfEmployees}
            </p>
          )}
        </div>

        {/* Surface Area */}
        <div className="space-y-2">
          <Label htmlFor="surfaceArea" className="flex items-center">
            <Building2 className="w-4 h-4 mr-2" />
            Surface totale des locaux étudiés (m²) *
          </Label>
          <Input
            id="surfaceArea"
            type="number"
            min="1"
            step="0.1"
            value={formData.surfaceArea || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              surfaceArea: parseFloat(e.target.value) || 0 
            }))}
            placeholder="Ex: 500"
            className={formErrors.surfaceArea ? 'border-red-500' : ''}
          />
          {formErrors.surfaceArea && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {formErrors.surfaceArea}
            </p>
          )}
          <p className="text-gray-500 text-sm">
            Incluez tous vos locaux étudiés : bureaux, entrepôts, ateliers, etc.
          </p>
        </div>

        {/* Annual Revenue */}
        <div className="space-y-2">
          <Label htmlFor="annualRevenue" className="flex items-center">
            <Building2 className="w-4 h-4 mr-2" />
            Chiffre d'affaires de l'année étudiée (DT) *
          </Label>
          <Input
            id="annualRevenue"
            type="number"
            min="1"
            step="1000"
            value={formData.annualRevenue || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              annualRevenue: parseFloat(e.target.value) || 0 
            }))}
            placeholder="Ex: 1500000"
            className={formErrors.annualRevenue ? 'border-red-500' : ''}
          />
          {formErrors.annualRevenue && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {formErrors.annualRevenue}
            </p>
          )}
          <p className="text-gray-500 text-sm">
            Chiffre d'affaires en dinars tunisiens pour calculer l'intensité carbone par CA
          </p>
        </div>

        {/* Studied Year */}
        <div className="space-y-2">
          <Label htmlFor="studiedYear" className="flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Année d'étude *
          </Label>
          <Input
            id="studiedYear"
            type="number"
            min="2020"
            max={new Date().getFullYear()}
            value={formData.studiedYear || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              studiedYear: parseInt(e.target.value) || 0 
            }))}
            placeholder={`Ex: ${new Date().getFullYear() - 1}`}
            className={formErrors.studiedYear ? 'border-red-500' : ''}
          />
          {formErrors.studiedYear && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {formErrors.studiedYear}
            </p>
          )}
          <p className="text-gray-500 text-sm">
            Année de référence pour les données collectées
          </p>
        </div>

        {/* Objectif Section */}
        <div className="bg-green-50 p-6 rounded-lg space-y-6 border border-green-200">
          <h3 className="text-lg font-semibold text-green-800 flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Objectifs de votre démarche carbone
          </h3>

          {/* Objectif Principal */}
          <div className="space-y-2">
            <Label htmlFor="objective" className="flex items-center">
              <Target className="w-4 h-4 mr-2" />
              Objectif principal de cette démarche *
            </Label>
            <Select
              value={formData.objective || ''}
              onValueChange={(value) => setFormData(prev => ({ ...prev, objective: value }))}
            >
              <SelectTrigger className={formErrors.objective ? 'border-red-500' : ''}>
                <SelectValue placeholder="Sélectionnez votre objectif principal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reglementation">Conformité réglementaire</SelectItem>
                <SelectItem value="reduction_emissions">Réduction des émissions GES</SelectItem>
                <SelectItem value="competitivite">Amélioration de la compétitivité</SelectItem>
                <SelectItem value="communication">Communication et image de marque</SelectItem>
                <SelectItem value="certification">Obtention de certifications</SelectItem>
                <SelectItem value="appel_offres">Répondre aux appels d'offres</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
            {formErrors.objective && (
              <p className="text-red-500 text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {formErrors.objective}
              </p>
            )}
          </div>

          {/* Motivation/Contexte */}
          <div className="space-y-2">
            <Label htmlFor="motivation" className="flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              Contexte et motivation de la démarche *
            </Label>
            <Textarea
              id="motivation"
              value={formData.motivation || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, motivation: e.target.value }))}
              placeholder="Décrivez le contexte qui vous amène à réaliser ce bilan carbone (ex: demande client, stratégie RSE, préparation d'un plan de transition...)"
              className={formErrors.motivation ? 'border-red-500' : ''}
              rows={3}
            />
            {formErrors.motivation && (
              <p className="text-red-500 text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {formErrors.motivation}
              </p>
            )}
          </div>

          {/* Année Cible */}
          <div className="space-y-2">
            <Label htmlFor="targetYear" className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Année cible pour vos objectifs de réduction
            </Label>
            <Input
              id="targetYear"
              type="number"
              min={new Date().getFullYear()}
              max={2050}
              value={formData.targetYear || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                targetYear: parseInt(e.target.value) || undefined 
              }))}
              placeholder={`Ex: ${new Date().getFullYear() + 5}`}
            />
            <p className="text-gray-500 text-sm">
              Optionnel : Année visée pour atteindre vos objectifs de réduction
            </p>
          </div>

          {/* Engagements Existants */}
          <div className="space-y-2">
            <Label className="flex items-center">
              <Award className="w-4 h-4 mr-2" />
              Engagements carbone existants
            </Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasCommitments"
                checked={formData.hasCommitments || false}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  hasCommitments: !!checked,
                  commitmentDetails: checked ? prev.commitmentDetails : ''
                }))}
              />
              <Label htmlFor="hasCommitments" className="text-sm">
                Nous avons déjà des engagements carbone (SBTi, Net Zero, labels, etc.)
              </Label>
            </div>
            
            {formData.hasCommitments && (
              <div className="mt-3">
                <Textarea
                  value={formData.commitmentDetails || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    commitmentDetails: e.target.value 
                  }))}
                  placeholder="Précisez vos engagements existants (ex: SBTi validé, objectif Net Zero 2030, label B-Corp...)"
                  className={formErrors.commitmentDetails ? 'border-red-500' : ''}
                  rows={2}
                />
                {formErrors.commitmentDetails && (
                  <p className="text-red-500 text-sm flex items-center mt-1">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {formErrors.commitmentDetails}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            Générer mon questionnaire personnalisé
          </Button>
        </div>
      </form>

      {/* Info Box */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">
              Pourquoi ces informations ?
            </h4>
            <p className="text-blue-800 text-sm">
              Ces données nous permettent de générer un questionnaire adapté à votre secteur d'activité 
              et de calculer des indicateurs pertinents (émissions par employé, par m², etc.).
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}; 