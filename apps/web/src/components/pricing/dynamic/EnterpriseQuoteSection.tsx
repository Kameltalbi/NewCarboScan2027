import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from "@/integrations/api/client";
import { Send, Building2 } from 'lucide-react';
import { PricingFormData } from './QuestionStepper';

interface EnterpriseQuoteSectionProps {
  formData: PricingFormData;
}

const erpSystems = [
  'SAP',
  'Oracle',
  'Microsoft Dynamics',
  'Sage',
  'Odoo',
  'Autre'
];

export const EnterpriseQuoteSection: React.FC<EnterpriseQuoteSectionProps> = ({
  formData
}) => {
  const { toast } = useToast();
  const [quoteData, setQuoteData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    sector: formData.sector || '',
    suppliers: '',
    sites: formData.sites.toString(),
    erp: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.submitLead({
        requestType: 'enterprise_quote',
        email: quoteData.email,
        companyName: quoteData.company,
        phone: quoteData.phone,
        fullName: quoteData.name,
        message: `Demande de devis Enterprise

Contact: ${quoteData.name}
Email: ${quoteData.email}
Téléphone: ${quoteData.phone}
Entreprise: ${quoteData.company}

Informations entreprise:
- Secteur: ${quoteData.sector}
- Nombre de salariés: ${formData.employees}
- Chiffre d'affaires: ${formData.revenue} KTND
- Nombre de sites: ${quoteData.sites}
- Nombre de fournisseurs: ${quoteData.suppliers}
- ERP utilisé: ${quoteData.erp}
- Scope 3: ${formData.hasScope3 ? 'Oui' : 'Non'}
- Modules souhaités: ${formData.selectedModules.join(', ') || 'Aucun'}

Notes additionnelles:
${quoteData.notes || 'Aucune'}`,
        payload: {
          sector: quoteData.sector,
          employees: formData.employees,
          revenue: formData.revenue,
          sites: quoteData.sites,
          suppliers: quoteData.suppliers,
          erp: quoteData.erp,
          hasScope3: formData.hasScope3,
          modules: formData.selectedModules,
        },
      });

      toast({
        title: 'Demande envoyée',
        description: 'Votre demande de devis a été envoyée avec succès. Nous vous contacterons sous 24h.',
      });

      // Reset form
      setQuoteData({
        name: '',
        email: '',
        company: '',
        phone: '',
        sector: formData.sector || '',
        suppliers: '',
        sites: formData.sites.toString(),
        erp: '',
        notes: ''
      });
    } catch (error: any) {
      console.error('Error submitting quote:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de l\'envoi de votre demande.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="bg-blue-50 rounded-t-lg">
        <div className="flex items-center gap-3">
          <Building2 className="w-8 h-8 text-blue-600" />
          <div>
            <CardTitle className="text-blue-700 text-2xl">
              Accompagnement personnalisé
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Échange de 15 minutes avec un expert CarboScan
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nom complet *</Label>
              <Input
                id="name"
                value={quoteData.name}
                onChange={(e) => setQuoteData({ ...quoteData, name: e.target.value })}
                required
                placeholder="Jean Dupont"
              />
            </div>
            <div>
              <Label htmlFor="email">Email professionnel *</Label>
              <Input
                id="email"
                type="email"
                value={quoteData.email}
                onChange={(e) => setQuoteData({ ...quoteData, email: e.target.value })}
                required
                placeholder="jean.dupont@entreprise.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company">Entreprise *</Label>
              <Input
                id="company"
                value={quoteData.company}
                onChange={(e) => setQuoteData({ ...quoteData, company: e.target.value })}
                required
                placeholder="Nom de l'entreprise"
              />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={quoteData.phone}
                onChange={(e) => setQuoteData({ ...quoteData, phone: e.target.value })}
                placeholder="+216 55 053 505"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sector">Secteur</Label>
              <Select
                value={quoteData.sector}
                onValueChange={(value) => setQuoteData({ ...quoteData, sector: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un secteur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="industrie">Industrie</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                  <SelectItem value="tech">Tech</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="suppliers">Nombre de fournisseurs (Scope 3)</Label>
              <Input
                id="suppliers"
                type="number"
                min="0"
                value={quoteData.suppliers}
                onChange={(e) => setQuoteData({ ...quoteData, suppliers: e.target.value })}
                placeholder="Ex: 50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sites">Nombre de sites</Label>
              <Input
                id="sites"
                type="number"
                min="1"
                value={quoteData.sites}
                onChange={(e) => setQuoteData({ ...quoteData, sites: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="erp">ERP utilisé</Label>
              <Select
                value={quoteData.erp}
                onValueChange={(value) => setQuoteData({ ...quoteData, erp: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un ERP" />
                </SelectTrigger>
                <SelectContent>
                  {erpSystems.map((erp) => (
                    <SelectItem key={erp} value={erp}>
                      {erp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes additionnelles</Label>
            <Textarea
              id="notes"
              value={quoteData.notes}
              onChange={(e) => setQuoteData({ ...quoteData, notes: e.target.value })}
              placeholder="Décrivez vos besoins spécifiques, contraintes, ou questions..."
              rows={4}
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Informations pré-remplies :</strong>
            </p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1">
              <li>• Salariés : {formData.employees}</li>
              <li>• Chiffre d'affaires : {formData.revenue} KTND</li>
              <li>• Scope 3 : {formData.hasScope3 ? 'Oui' : 'Non'}</li>
              <li>• Modules souhaités : {formData.selectedModules.join(', ') || 'Aucun'}</li>
            </ul>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isSubmitting}
          >
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Envoi en cours...' : 'Recevoir ma proposition détaillée'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

