// Section Organisation Professionnelle - Toutes les infos pour le rapport

import React, { useState, useRef, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { SiteAllocationSettings } from '@/components/parametres/SiteAllocationSettings';
import { MethodNoteLink } from '@/components/method/MethodNoteLink';
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
import { api, supabase } from "@/integrations/api/client";
import { SiteOperationField } from "@/components/collect/sites/SiteOperationField";
import {
  CONSOLIDATION_METHODS,
  fromOperationChoice,
  operationStatusLabel,
  toOperationChoice,
  type ConsolidationMethod,
  type OperationChoice,
} from "@/lib/perimeter/consolidation";
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

/** Compresse le logo en data URL pour api.patchOrganization (plafond schéma 500k). */
async function fileToLogoDataUrl(file: File, maxChars = 450_000): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Image illisible'));
      el.src = objectUrl;
    });

    const maxSide = 512;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height, 1));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponible');
    ctx.drawImage(img, 0, 0, w, h);

    const preferPng = file.type === 'image/png';
    const mime = preferPng ? 'image/png' : 'image/webp';
    let quality = 0.9;
    let dataUrl = canvas.toDataURL(mime, quality);
    while (dataUrl.length > maxChars && quality > 0.45) {
      quality -= 0.1;
      dataUrl = canvas.toDataURL('image/webp', quality);
    }
    if (dataUrl.length > maxChars) {
      // Dernier recours : plus petit côté
      const w2 = Math.max(1, Math.round(w * 0.7));
      const h2 = Math.max(1, Math.round(h * 0.7));
      canvas.width = w2;
      canvas.height = h2;
      ctx.drawImage(img, 0, 0, w2, h2);
      dataUrl = canvas.toDataURL('image/webp', 0.7);
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

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
    productionUnitLabel: '',
    productionUnitQuantity: '',
    currency: 'TND',
    consolidationMethod: 'operational_control' as ConsolidationMethod,
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
    operation_status: 'unspecified' as OperationChoice,
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
        const { organization: org } = await api.getOrganization();

        if (org) {
          setOrgId(org.id);
          setOrgData({
            organizationName: org.name || '',
            legalName: org.legalName || '',
            pilotName: org.pilotName || '',
            country: org.country || 'Tunisie',
            sector: org.sector || '',
            referenceYear: org.referenceYear?.toString() || new Date().getFullYear().toString(),
            employees: org.employees?.toString() || '',
            totalSurface: org.totalSurface?.toString() || '',
            annualRevenue: org.annualRevenue?.toString() || '',
            productionUnitLabel: org.productionUnitLabel || '',
            productionUnitQuantity: org.productionUnitQuantity?.toString() || '',
            currency: org.currency || 'TND',
            consolidationMethod:
              org.consolidationMethod === 'financial_control'
                ? 'financial_control'
                : 'operational_control',
          });

          if (org.logoUrl) setLogoUrl(org.logoUrl);
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
      const { organization: saved } = await api.patchOrganization({
        name: orgData.organizationName,
        legalName: orgData.legalName || null,
        pilotName: orgData.pilotName || null,
        country: orgData.country,
        sector: orgData.sector || null,
        referenceYear: parseInt(orgData.referenceYear),
        employees: totalEmployees > 0 ? totalEmployees : parseInt(orgData.employees) || null,
        totalSurface: totalSurface > 0 ? totalSurface : parseFloat(orgData.totalSurface) || null,
        annualRevenue: orgData.annualRevenue ? parseFloat(orgData.annualRevenue) : null,
        productionUnitLabel: orgData.productionUnitLabel.trim() || null,
        productionUnitQuantity: orgData.productionUnitQuantity ? parseFloat(orgData.productionUnitQuantity) : null,
        currency: orgData.currency,
        consolidationMethod: orgData.consolidationMethod,
      });
      const savedOrgId = saved?.id ?? orgId;
      if (saved?.id) setOrgId(saved.id);

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

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && !file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image JPG, PNG ou WebP');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 2 Mo');
      return;
    }

    setIsUploading(true);

    try {
      // Stocker le logo via l'API org (data URL) — supabase.storage n'existe plus.
      const dataUrl = await fileToLogoDataUrl(file);
      if (dataUrl.length > 500_000) {
        toast.error('Logo trop volumineux après compression. Essayez une image plus légère.');
        return;
      }

      const { organization } = await api.patchOrganization({ logoUrl: dataUrl });
      if (organization?.id) setOrgId(organization.id);
      setLogoUrl(organization?.logoUrl ?? dataUrl);
      queryClient.invalidateQueries({ queryKey: ['organization-data'] });
      window.dispatchEvent(new CustomEvent('orgLogoUpdated'));
      toast.success('Logo téléchargé avec succès');
    } catch (error: unknown) {
      logger.error('Upload error:', error);
      const msg = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`Erreur téléchargement logo : ${msg}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!user?.id) return;

    setIsUploading(true);
    try {
      await api.patchOrganization({ logoUrl: null });
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
      operation_status: 'unspecified',
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
      operation_status: toOperationChoice(site.operation_status),
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
      operation_status: fromOperationChoice(siteFormData.operation_status),
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

          <div className="space-y-2">
            <Label htmlFor="consolidationMethod">Méthode de consolidation</Label>
            <Select
              value={orgData.consolidationMethod}
              onValueChange={(value) =>
                setOrgData({ ...orgData, consolidationMethod: value as ConsolidationMethod })
              }
            >
              <SelectTrigger id="consolidationMethod" data-testid="consolidation-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONSOLIDATION_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Le rapport reprend cette méthode. Tant qu'elle n'est pas changée, il indique le contrôle opérationnel, comme auparavant. Changer de méthode laisse chaque ligne à son scope. La quote-part n'est pas calculée. Ce choix n'est pas une validation ABC.{" "}
              <MethodNoteLink noteId="perimetres" label="Note de méthode : périmètre" />
            </p>
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
              Sert à l&apos;intensité en tCO₂e par million de {orgData.currency}. Un montant vide n&apos;affiche pas d&apos;intensité.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employees">Effectif</Label>
              <Input
                id="employees"
                type="number"
                value={orgData.employees}
                onChange={(e) => setOrgData({ ...orgData, employees: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalSurface">Surface (m²)</Label>
              <Input
                id="totalSurface"
                type="number"
                value={orgData.totalSurface}
                onChange={(e) => setOrgData({ ...orgData, totalSurface: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            S&apos;il existe des sites avec un effectif ou une surface, l&apos;enregistrement reprend leur somme.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="productionUnitLabel">Unité produite ou KPI métier</Label>
              <Input
                id="productionUnitLabel"
                value={orgData.productionUnitLabel}
                onChange={(e) => setOrgData({ ...orgData, productionUnitLabel: e.target.value })}
                placeholder="Ex. : pièce, tonne, heure"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productionUnitQuantity">Quantité annuelle</Label>
              <Input
                id="productionUnitQuantity"
                type="number"
                value={orgData.productionUnitQuantity}
                onChange={(e) => setOrgData({ ...orgData, productionUnitQuantity: e.target.value })}
              />
            </div>
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
                          <Badge variant="outline" className="text-xs font-normal">
                            {operationStatusLabel(site.operation_status)}
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

            <SiteOperationField
              value={siteFormData.operation_status}
              onChange={(operation_status) => setSiteFormData({ ...siteFormData, operation_status })}
            />

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
