// Section Organisation Professionnelle - Toutes les infos pour le rapport

import React, { useState, useRef, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { SiteAllocationSettings } from '@/components/parametres/SiteAllocationSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  Save, 
  Upload, 
  X, 
  Loader2, 
  MapPin, 
  Users, 
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Factory,
  Warehouse,
  Store,
  Home,
  CheckCircle2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from "@/integrations/api/client";
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useCollectSites, type CollectSite, type CreateSiteInput } from '@/hooks/useCollectSites';
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

const SITE_TYPES = [
  { value: 'siege', label: 'Siège social', icon: Home },
  { value: 'bureau', label: 'Bureau', icon: Building2 },
  { value: 'usine', label: 'Usine', icon: Factory },
  { value: 'entrepot', label: 'Entrepôt', icon: Warehouse },
  { value: 'magasin', label: 'Magasin', icon: Store },
  { value: 'autre', label: 'Autre', icon: MapPin },
];

export const ParametresOrganisationPro: React.FC = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  
  // États pour les sites
  const [editingSite, setEditingSite] = useState<CollectSite | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<CollectSite | null>(null);
  
  const [orgData, setOrgData] = useState({
    organizationName: '',
    legalName: '',
    pilotName: '',
    country: 'Tunisie',
    sector: '',
    referenceYear: new Date().getFullYear().toString(),
    employees: '',
    totalSurface: '',
    annualRevenue: '',
    currency: 'TND',
  });

  const currencies = [
    { value: 'TND', label: 'Dinar tunisien (TND)', symbol: 'TND' },
    { value: 'EUR', label: 'Euro (EUR)', symbol: '€' },
    { value: 'USD', label: 'Dollar US (USD)', symbol: '$' },
    { value: 'MAD', label: 'Dirham marocain (MAD)', symbol: 'MAD' },
    { value: 'DZD', label: 'Dinar algérien (DZD)', symbol: 'DZD' },
    { value: 'CHF', label: 'Franc suisse (CHF)', symbol: 'CHF' },
    { value: 'CAD', label: 'Dollar canadien (CAD)', symbol: 'CAD' },
    { value: 'GBP', label: 'Livre sterling (GBP)', symbol: '£' },
  ];

  const [siteFormData, setSiteFormData] = useState({
    name: '',
    code: '',
    city: '',
    country: 'Tunisie',
    address: '',
    site_type: 'bureau',
    employees_count: '',
    surface_m2: '',
    annual_revenue: '',
  });

  // Récupérer la company de l'utilisateur
  const { data: company } = useQuery({
    queryKey: ['user-company-for-org-pro', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id, nom_entreprise')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (existingCompany) return existingCompany;
      
      const { data: org } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (org) {
        const { data: newCompany, error } = await supabase
          .from('companies')
          .insert({
            user_id: user.id,
            nom_entreprise: org.name,
          })
          .select('id, nom_entreprise')
          .single();
        
        if (error) {
          console.error('Error creating company:', error);
          return null;
        }
        return newCompany;
      }
      
      return null;
    },
    enabled: !!user?.id,
  });

  const { sites, isLoading: sitesLoading, createSite, updateSite, deleteSite } = useCollectSites(company?.id);

  // Statistiques auto-calculées depuis les sites
  const totalEmployees = sites.reduce((acc, s) => acc + (s.employees_count || 0), 0);
  const totalSurface = sites.reduce((acc, s) => acc + (s.surface_m2 || 0), 0);
  const activeSitesCount = sites.filter(s => s.is_active).length;

  // Charger les données de l'organisation
  useEffect(() => {
    const loadOrganization = async () => {
      if (!user?.id) return;

      try {
        const { data: org, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (org) {
          setOrgId(org.id);
          setOrgData({
            organizationName: org.name || '',
            legalName: org.legal_name || '',
            pilotName: org.pilot_name || '',
            country: org.country || 'Tunisie',
            sector: org.sector || '',
            referenceYear: org.reference_year?.toString() || new Date().getFullYear().toString(),
            employees: org.employees?.toString() || '',
            totalSurface: org.total_surface?.toString() || '',
            annualRevenue: org.annual_revenue?.toString() || '',
            currency: org.currency || 'TND',
          });
          
          if (org.logo_url) setLogoUrl(org.logo_url);

          const { data: orgFiles } = await supabase.storage
            .from('organization-logos')
            .list(org.id, { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });

          if (!org.logo_url && orgFiles && orgFiles.length > 0) {
            const { data: urlData } = supabase.storage
              .from('organization-logos')
              .getPublicUrl(`${org.id}/${orgFiles[0].name}`);
            setLogoUrl(urlData.publicUrl);
          }
        }

        const { data: files } = await supabase.storage
          .from('organization-logos')
          .list(`${user.id}/`, { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });

        if (!org?.logo_url && files && files.length > 0) {
          const { data: urlData } = supabase.storage
            .from('organization-logos')
            .getPublicUrl(`${user.id}/${files[0].name}`);
          setLogoUrl(urlData.publicUrl);
        }
      } catch (error) {
        console.error('Error loading organization:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrganization();
  }, [user?.id]);

  // Auto-sync des totaux depuis les sites
  useEffect(() => {
    if (!sitesLoading && sites.length > 0) {
      setOrgData(prev => ({
        ...prev,
        employees: totalEmployees.toString(),
        totalSurface: totalSurface.toString(),
      }));
    }
  }, [totalEmployees, totalSurface, sitesLoading, sites.length]);

  const handleSaveOrganization = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const orgDataToSave = {
        name: orgData.organizationName,
        legal_name: orgData.legalName || null,
        pilot_name: orgData.pilotName || null,
        country: orgData.country,
        sector: orgData.sector || null,
        reference_year: parseInt(orgData.referenceYear),
        employees: totalEmployees > 0 ? totalEmployees : parseInt(orgData.employees) || null,
        total_surface: totalSurface > 0 ? totalSurface : parseFloat(orgData.totalSurface) || null,
        annual_revenue: orgData.annualRevenue ? parseFloat(orgData.annualRevenue) : null,
        currency: orgData.currency,
        logo_url: logoUrl,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      let savedOrgId: string | null = orgId;
      if (orgId) {
        const { error } = await supabase
          .from('organizations')
          .update(orgDataToSave)
          .eq('id', orgId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('organizations')
          .insert(orgDataToSave)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setOrgId(data.id);
          savedOrgId = data.id;
        }
      }

      if (savedOrgId) {
        const presetCode = getPresetCodeForSector(orgData.sector || null);
        if (presetCode) {
          try {
            await applyPresetForOrganization(savedOrgId, presetCode);
            queryClient.invalidateQueries({ queryKey: ['organization-subcategories'] });
          } catch (e) {
            logger.warn('Apply sector preset:', e);
          }
        }
      }

      toast.success('Organisation enregistrée - Données prêtes pour le rapport');
      queryClient.invalidateQueries({ queryKey: ['organization-data'] });
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

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 2 Mo');
      return;
    }

    setIsUploading(true);

    try {
      // Vérifie le token auprès de Supabase et évite d'utiliser un état local stale.
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const authedUserId = authData.user?.id;
      if (!authedUserId) {
        toast.error('Session expirée. Merci de vous reconnecter.');
        setIsUploading(false);
        return;
      }

      let targetOrgId = orgId;
      if (!targetOrgId) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('user_id', authedUserId)
          .maybeSingle();
        if (orgError) throw orgError;
        targetOrgId = org?.id || null;
        if (targetOrgId) setOrgId(targetOrgId);
      }

      if (!targetOrgId) {
        toast.error('Enregistrez d’abord l’organisation avant d’ajouter un logo.');
        setIsUploading(false);
        return;
      }

      const fileExt = (file.name.split('.').pop() || 'png').toLowerCase();
      // Storage reste sécurisé par utilisateur connecté ; l'URL publique est ensuite rattachée à l'organisation.
      const filePath = `${authedUserId}/logo.${fileExt}`;

      // Nettoyer les anciens logos de cet utilisateur (toutes extensions)
      const { data: existing } = await supabase.storage
        .from('organization-logos')
        .list(authedUserId);
      if (existing && existing.length > 0) {
        await supabase.storage
          .from('organization-logos')
          .remove(existing.map(f => `${authedUserId}/${f.name}`));
      }

      const { error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(filePath, file, { upsert: true, contentType: file.type || `image/${fileExt}` });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('organization-logos')
        .getPublicUrl(filePath);

      const newLogoUrl = urlData.publicUrl + '?t=' + Date.now();

      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: newLogoUrl, updated_at: new Date().toISOString() })
        .eq('id', targetOrgId);
      if (updateError) throw updateError;

      setLogoUrl(newLogoUrl);
      queryClient.invalidateQueries({ queryKey: ['organization-data'] });
      window.dispatchEvent(new CustomEvent('orgLogoUpdated'));
      toast.success('Logo téléchargé avec succès');
    } catch (error: any) {
      logger.error('Upload error:', error);
      const msg = error?.message || error?.error || 'Erreur inconnue';
      toast.error(`Erreur téléchargement logo : ${msg}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!user?.id) return;

    setIsUploading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const authedUserId = authData.user?.id;
      if (!authedUserId) {
        toast.error('Session expirée. Merci de vous reconnecter.');
        return;
      }

      const targetOrgId = orgId;
      if (!targetOrgId) {
        toast.error('Organisation introuvable');
        return;
      }

      const { data: files } = await supabase.storage
        .from('organization-logos')
        .list(authedUserId);

      if (files && files.length > 0) {
        const filesToRemove = files.map(f => `${authedUserId}/${f.name}`);
        await supabase.storage
          .from('organization-logos')
          .remove(filesToRemove);
      }

      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: null, updated_at: new Date().toISOString() })
        .eq('id', targetOrgId);
      if (updateError) throw updateError;

      setLogoUrl(null);
      queryClient.invalidateQueries({ queryKey: ['organization-data'] });
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

  // Gestion des sites
  const resetSiteForm = () => {
    setSiteFormData({
      name: '',
      code: '',
      city: '',
      country: 'Tunisie',
      address: '',
      site_type: 'bureau',
      employees_count: '',
      surface_m2: '',
      annual_revenue: '',
    });
    setEditingSite(null);
    setIsFormOpen(false);
  };

  const handleEditSite = (site: CollectSite) => {
    setEditingSite(site);
    setSiteFormData({
      name: site.name,
      code: site.code || '',
      city: site.city || '',
      country: site.country || 'Tunisie',
      address: site.address || '',
      site_type: site.site_type || 'bureau',
      employees_count: site.employees_count?.toString() || '',
      surface_m2: site.surface_m2?.toString() || '',
      annual_revenue: site.annual_revenue?.toString() || '',
    });
    setIsFormOpen(true);
  };

  const handleDeleteSite = (site: CollectSite) => {
    setSiteToDelete(site);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSite = async () => {
    if (siteToDelete) {
      await deleteSite.mutateAsync(siteToDelete.id);
      setDeleteDialogOpen(false);
      setSiteToDelete(null);
      toast.success('Site supprimé');
    }
  };

  const handleSubmitSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;

    const siteData: CreateSiteInput = {
      company_id: company.id,
      name: siteFormData.name,
      code: siteFormData.code || undefined,
      city: siteFormData.city || undefined,
      country: siteFormData.country,
      address: siteFormData.address || undefined,
      site_type: siteFormData.site_type,
      employees_count: siteFormData.employees_count ? parseInt(siteFormData.employees_count) : undefined,
      surface_m2: siteFormData.surface_m2 ? parseFloat(siteFormData.surface_m2) : undefined,
      annual_revenue: siteFormData.annual_revenue ? parseFloat(siteFormData.annual_revenue) : undefined,
      is_active: true,
      is_consolidated: true,
    };

    if (editingSite) {
      await updateSite.mutateAsync({ id: editingSite.id, ...siteData });
      toast.success('Site mis à jour');
    } else {
      await createSite.mutateAsync(siteData);
      toast.success('Site créé');
    }

    resetSiteForm();
  };

  const getSiteTypeInfo = (type?: string) => {
    return SITE_TYPES.find(t => t.value === type) || SITE_TYPES[5];
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Organisation Professionnelle</h1>
            <p className="text-sm text-muted-foreground">
              Toutes les informations nécessaires pour la génération des rapports
            </p>
          </div>
        </div>
      </div>

      {/* Alerte : Données pour rapport */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-1">
                Ces données alimentent automatiquement vos rapports Bilan Carbone
              </p>
              <p className="text-xs text-muted-foreground">
                Les totaux (employés, surface) sont calculés automatiquement à partir de vos sites. 
                Complétez les informations de chaque site pour une génération de rapport optimale.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 1 : INFORMATIONS GÉNÉRALES */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informations générales</CardTitle>
          <CardDescription>Identité et contexte de votre organisation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div>
            <Label className="mb-3 block">Logo de l'organisation</Label>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 border-2 border-border">
                  <AvatarImage src={logoUrl || undefined} alt="Logo" />
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">
                    {getInitials(orgData.organizationName || 'Organisation')}
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
          </div>

          <Separator />

          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Nom de l'organisation *</Label>
              <Input
                id="orgName"
                placeholder="Nom de votre entreprise"
                value={orgData.organizationName}
                onChange={(e) => setOrgData({ ...orgData, organizationName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalName">Dénomination complète dans le rapport (optionnel)</Label>
              <Input
                id="legalName"
                placeholder="Ex: Chambre de Commerce et d'Industrie Tuniso-Française (CCITF)"
                value={orgData.legalName}
                onChange={(e) => setOrgData({ ...orgData, legalName: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Si renseigné, remplace le nom de l'organisation dans la page de gouvernance du rapport Bilan Carbone®.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pilotName">Pilote de la démarche Bilan Carbone®</Label>
              <Input
                id="pilotName"
                placeholder="Ex: M. Mohamed Talbi"
                value={orgData.pilotName}
                onChange={(e) => setOrgData({ ...orgData, pilotName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sector">Secteur d'activité *</Label>
              <Select value={orgData.sector} onValueChange={(v) => setOrgData({ ...orgData, sector: v })}>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Pays / Région *</Label>
              <Select value={orgData.country} onValueChange={(v) => setOrgData({ ...orgData, country: v })}>
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
            <div className="space-y-2">
              <Label htmlFor="refYear">Année de référence *</Label>
              <Select value={orgData.referenceYear} onValueChange={(v) => setOrgData({ ...orgData, referenceYear: v })}>
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

          {/* Section Devise */}
          <div className="space-y-2">
            <Label htmlFor="currency">Devise</Label>
            <Select value={orgData.currency} onValueChange={(v) => setOrgData({ ...orgData, currency: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une devise" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              La devise sera utilisée pour tous les affichages financiers
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="annualRevenue">Chiffre d'affaires annuel ({orgData.currency})</Label>
            <Input
              id="annualRevenue"
              type="number"
              placeholder="Ex: 5000000"
              value={orgData.annualRevenue}
              onChange={(e) => setOrgData({ ...orgData, annualRevenue: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Utilisé pour calculer l'intensité carbone par 1k{orgData.currency} de CA
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveOrganization} className="gap-2" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer l'organisation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2 : GESTION DES SITES */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Sites de l'organisation</CardTitle>
              <CardDescription>
                Configurez chaque site avec ses caractéristiques (employés, surface)
              </CardDescription>
            </div>
            <Button onClick={() => setIsFormOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un site
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sitesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : sites.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Aucun site configuré</p>
              <p className="text-sm mb-4">Ajoutez vos sites pour alimenter automatiquement le rapport</p>
              <Button onClick={() => setIsFormOpen(true)} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter un site
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sites.map((site) => {
                const typeInfo = getSiteTypeInfo(site.site_type);
                const TypeIcon = typeInfo.icon;
                return (
                  <div 
                    key={site.id} 
                    className={`flex items-center justify-between p-4 border rounded-lg ${!site.is_active ? 'opacity-60 bg-muted/30' : 'hover:bg-muted/50'} transition-colors`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-2.5 rounded-lg bg-primary/10">
                        <TypeIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2 flex-wrap">
                          {site.name}
                          {site.code && (
                            <Badge variant="outline" className="text-xs font-normal">
                              {site.code}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs font-normal">
                            {typeInfo.label}
                          </Badge>
                          {!site.is_active && (
                            <Badge variant="secondary" className="text-xs">Inactif</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1 flex-wrap">
                          {site.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {site.city}, {site.country}
                            </span>
                          )}
                          {site.employees_count !== undefined && site.employees_count > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <strong>{site.employees_count}</strong> employés
                            </span>
                          )}
                          {site.surface_m2 !== undefined && site.surface_m2 > 0 && (
                            <span className="font-medium">
                              <strong>{site.surface_m2.toLocaleString('fr-FR')}</strong> m²
                            </span>
                          )}
                          {site.annual_revenue !== undefined && site.annual_revenue > 0 && (
                            <span className="font-medium text-indigo-600">
                              CA : <strong>{site.annual_revenue.toLocaleString('fr-FR')}</strong> {orgData.currency}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditSite(site)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteSite(site)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 3 : RÉPARTITION DES ÉMISSIONS */}
      <SiteAllocationSettings 
        organizationId={orgId} 
        companyId={company?.id} 
      />

      {/* Dialog formulaire site */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {editingSite ? 'Modifier le site' : 'Nouveau site'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitSite} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="site_name">Nom du site *</Label>
                <Input
                  id="site_name"
                  value={siteFormData.name}
                  onChange={(e) => setSiteFormData({ ...siteFormData, name: e.target.value })}
                  placeholder="Ex: Usine Tunis Nord"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site_code">Code</Label>
                <Input
                  id="site_code"
                  value={siteFormData.code}
                  onChange={(e) => setSiteFormData({ ...siteFormData, code: e.target.value })}
                  placeholder="Ex: TUN-01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="site_type">Type de site *</Label>
              <Select
                value={siteFormData.site_type}
                onValueChange={(value) => setSiteFormData({ ...siteFormData, site_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SITE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="site_address">Adresse</Label>
              <Input
                id="site_address"
                value={siteFormData.address}
                onChange={(e) => setSiteFormData({ ...siteFormData, address: e.target.value })}
                placeholder="Adresse complète"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="site_city">Ville</Label>
                <Input
                  id="site_city"
                  value={siteFormData.city}
                  onChange={(e) => setSiteFormData({ ...siteFormData, city: e.target.value })}
                  placeholder="Ex: Tunis"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site_country">Pays</Label>
                <Input
                  id="site_country"
                  value={siteFormData.country}
                  onChange={(e) => setSiteFormData({ ...siteFormData, country: e.target.value })}
                  placeholder="Ex: Tunisie"
                />
              </div>
            </div>

            <Separator />

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900 mb-3">
                📊 Données pour le rapport (optionnel mais recommandé)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="site_employees">Nombre d'employés</Label>
                  <Input
                    id="site_employees"
                    type="number"
                    value={siteFormData.employees_count}
                    onChange={(e) => setSiteFormData({ ...siteFormData, employees_count: e.target.value })}
                    placeholder="Ex: 50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site_surface">Surface (m²)</Label>
                  <Input
                    id="site_surface"
                    type="number"
                    value={siteFormData.surface_m2}
                    onChange={(e) => setSiteFormData({ ...siteFormData, surface_m2: e.target.value })}
                    placeholder="Ex: 2500"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="site_revenue">Chiffre d'affaires ({orgData.currency}) <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                  <Input
                    id="site_revenue"
                    type="number"
                    value={siteFormData.annual_revenue}
                    onChange={(e) => setSiteFormData({ ...siteFormData, annual_revenue: e.target.value })}
                    placeholder="Ex: 1500000"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={resetSiteForm}>
                Annuler
              </Button>
              <Button type="submit" disabled={createSite.isPending || updateSite.isPending}>
                {createSite.isPending || updateSite.isPending ? 'Enregistrement...' : 
                  editingSite ? 'Mettre à jour' : 'Créer le site'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le site</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le site "{siteToDelete?.name}" ?
              Cette action est irréversible et supprimera également toutes les données associées à ce site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSite}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
