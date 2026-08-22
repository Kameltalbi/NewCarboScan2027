// Section 1: Organisation & Contexte

import React, { useState, useRef, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, Save, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from "@/integrations/api/client";
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { getPresetCodeForSector, applyPresetForOrganization } from '@/lib/scope3/sector-preset-service';

const sectors = [
  'Agriculture',
  'Agroalimentaire',
  'Chimie / Pharmacie',
  'Cimenterie',
  'Commerce',
  'Concession automobile',
  'Construction',
  'Coworking',
  'Éducation',
  'Énergie',
  'Finance et assurance',
  'Hôtellerie / Restauration',
  'Immobilier',
  'Industrie manufacturière',
  'Santé',
  'Services',
  'Technologies de l\'information',
  'Télécommunications',
  'Textile / Mode',
  'Transport et logistique',
  'Autre',
];

const countries = [
  'Tunisie',
  'France',
  'Maroc',
  'Algérie',
  'Belgique',
  'Suisse',
  'Canada',
  'Autre',
];

const currencies = [
  { value: 'TND', label: 'Dinar tunisien (TND)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'USD', label: 'Dollar US (USD)' },
  { value: 'MAD', label: 'Dirham marocain (MAD)' },
  { value: 'DZD', label: 'Dinar algérien (DZD)' },
  { value: 'CHF', label: 'Franc suisse (CHF)' },
  { value: 'CAD', label: 'Dollar canadien (CAD)' },
];

export const ParametresOrganisation: React.FC = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    organizationName: '',
    country: 'Tunisie',
    sector: '',
    referenceYear: new Date().getFullYear().toString(),
    currency: 'TND',
    energyUnit: 'kWh',
    massUnit: 'kg',
    distanceUnit: 'km',
  });

  // Charger les données de l'organisation
  useEffect(() => {
    const loadOrganization = async () => {
      if (!user?.id) return;

      try {
        // Charger l'organisation
        const { organization: org } = await api.getOrganization();

        if (org) {
          setOrgId(org.id);
          setFormData({
            organizationName: org.name || '',
            country: org.country || 'Tunisie',
            sector: org.sector || '',
            referenceYear: org.referenceYear?.toString() || new Date().getFullYear().toString(),
            currency: org.currency || 'TND',
            energyUnit: org.energyUnit || 'kWh',
            massUnit: org.massUnit || 'kg',
            distanceUnit: org.distanceUnit || 'km',
          });
          
          if (org.logoUrl) {
            setLogoUrl(org.logoUrl);
          }
        }
      } catch (error) {
        console.error('Error loading organization:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrganization();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      await api.patchOrganization({
        name: formData.organizationName,
        country: formData.country,
        sector: formData.sector || null,
        referenceYear: parseInt(formData.referenceYear),
        currency: formData.currency,
        energyUnit: formData.energyUnit,
        massUnit: formData.massUnit,
        distanceUnit: formData.distanceUnit,
        logoUrl,
      });
      const savedOrgId = orgId;

      const finalOrgId = savedOrgId;
      if (finalOrgId) {
        const presetCode = getPresetCodeForSector(formData.sector || null);
        if (presetCode) {
          try {
            await applyPresetForOrganization(finalOrgId, presetCode);
            queryClient.invalidateQueries({ queryKey: ['organization-subcategories'] });
          } catch (e) {
            logger.warn('Apply sector preset:', e);
          }
        }
      }

      toast.success('Paramètres de l\'organisation enregistrés');
      // Invalider le cache React Query pour que le dashboard se mette à jour
      queryClient.invalidateQueries({ queryKey: ['organization-data'] });
      // Notifier les autres composants que l'organisation a été sauvegardée
      window.dispatchEvent(new CustomEvent('organizationSaved'));
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 400 * 1024) {
      toast.error('L\'image ne doit pas dépasser 400 Ko');
      return;
    }

    setIsUploading(true);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setLogoUrl(dataUrl);
      await api.patchOrganization({ logoUrl: dataUrl });
      window.dispatchEvent(new CustomEvent('orgLogoUpdated'));
      toast.success('Logo téléchargé avec succès');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors du téléchargement du logo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!user?.id) return;

    setIsUploading(true);
    try {
      await api.patchOrganization({ logoUrl: null });
      setLogoUrl(null);
      window.dispatchEvent(new CustomEvent('orgLogoUpdated'));
      toast.success('Logo supprimé');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erreur lors de la suppression du logo');
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'OR';
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Organisation & Contexte</h1>
            <p className="text-sm text-muted-foreground">Informations générales de votre organisation</p>
          </div>
        </div>
        <Button onClick={handleSave} className="gap-2" disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </Button>
      </div>

      {/* Logo de l'organisation */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Logo de l'organisation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-2 border-border">
                <AvatarImage src={logoUrl || undefined} alt="Logo" />
                <AvatarFallback className="text-lg bg-primary/10 text-primary">
                  {getInitials(formData.organizationName || 'Organisation')}
                </AvatarFallback>
              </Avatar>
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Télécharger
                </Button>
                {logoUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                    disabled={isUploading}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                    Supprimer
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Format : JPG, PNG ou WebP. Taille max : 2 Mo
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations générales */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Nom de l'organisation</Label>
              <Input
                id="orgName"
                placeholder="Nom de votre entreprise"
                value={formData.organizationName}
                onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Pays / Région</Label>
              <Select value={formData.country} onValueChange={(v) => setFormData({ ...formData, country: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un pays" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sector">Secteur d'activité</Label>
              <Select value={formData.sector} onValueChange={(v) => setFormData({ ...formData, sector: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un secteur" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="refYear">Année de référence</Label>
              <Select value={formData.referenceYear} onValueChange={(v) => setFormData({ ...formData, referenceYear: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2020, 2021, 2022, 2023, 2024, 2025, 2026].map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Devise et unités */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Devise et unités par défaut</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Devise</Label>
              <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="energyUnit">Unité d'énergie</Label>
              <Select value={formData.energyUnit} onValueChange={(v) => setFormData({ ...formData, energyUnit: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kWh">kWh</SelectItem>
                  <SelectItem value="MWh">MWh</SelectItem>
                  <SelectItem value="GJ">GJ</SelectItem>
                  <SelectItem value="tep">tep (tonne équivalent pétrole)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="massUnit">Unité de masse</Label>
              <Select value={formData.massUnit} onValueChange={(v) => setFormData({ ...formData, massUnit: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="t">Tonne (t)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="distanceUnit">Unité de distance</Label>
              <Select value={formData.distanceUnit} onValueChange={(v) => setFormData({ ...formData, distanceUnit: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="km">km</SelectItem>
                  <SelectItem value="miles">Miles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
